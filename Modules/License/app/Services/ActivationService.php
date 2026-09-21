<?php

declare(strict_types=1);

namespace Modules\License\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Support\SemVer;
use Modules\Customer\Models\Customer;
use Modules\License\Models\ActivationRequest;
use Modules\License\Models\Device;
use Modules\License\Models\License;

// مدیریت مسیر درخواستی فعال‌سازی و مسیر کد یک‌بارمصرف
class ActivationService
{
    public function __construct(
        private readonly LicenseService $licenses,
        private readonly LicenseCodeService $codes,
        private readonly TokenService $tokens,
        private readonly AuditLogger $audit,
    ) {}

    /** @param array<string, mixed> $systemInfo */
    public function createRequest(string $fingerprint, array $systemInfo, ?string $appVersion, ?string $name, ?string $phone, ?string $ip): ActivationRequest
    {
        if (Device::query()->where('fingerprint', $fingerprint)->exists()) {
            throw ValidationException::withMessages([
                'fingerprint' => 'این دستگاه قبلاً فعال شده است.',
            ]);
        }

        $pending = ActivationRequest::query()
            ->where('fingerprint', $fingerprint)
            ->where('status', 'pending')
            ->first();

        if ($pending !== null) {
            return $pending;
        }

        $request = ActivationRequest::query()->create([
            'fingerprint'      => $fingerprint,
            'customer_name'    => $name,
            'customer_phone'   => $phone,
            'app_version'      => $appVersion,
            'app_version_code' => SemVer::toCode($appVersion),
            'system_info'      => $systemInfo,
            'request_ip'       => $ip,
            'status'           => 'pending',
        ]);

        $this->audit->license(null, 'activation.requested', 'درخواست فعال‌سازی جدید', [
            'request_uuid' => $request->uuid,
            'fingerprint'  => $fingerprint,
        ]);

        return $request;
    }

    // تأیید ادمین: انتخاب مشتری، پلن و مدت و سپس صدور و فعال‌سازی لایسنس
    public function approve(ActivationRequest $request, Customer $customer, int $planId, string $durationType, ?User $actor = null): License
    {
        if ($request->status !== 'pending') {
            throw ValidationException::withMessages(['request' => 'این درخواست قبلاً بررسی شده است.']);
        }

        return DB::transaction(function () use ($request, $customer, $planId, $durationType, $actor): License {
            $license = $this->licenses->issue($customer->getKey(), $planId, $durationType, $actor, 'تأیید درخواست فعال‌سازی');

            $this->licenses->activate(
                $license,
                $request->fingerprint,
                (array) ($request->system_info ?? []),
                $request->app_version,
                $request->request_ip,
            );

            $request->forceFill([
                'status'      => 'approved',
                'license_id'  => $license->getKey(),
                'reviewed_by' => $actor?->getKey(),
                'reviewed_at' => Carbon::now('UTC'),
            ])->save();

            $this->audit->log('license.approve', 'تأیید درخواست فعال‌سازی', 'ActivationRequest', $request->getKey(), null, [
                'license_uuid' => $license->uuid,
            ]);

            return $license->refresh();
        });
    }

    public function reject(ActivationRequest $request, string $reason, ?User $actor = null): ActivationRequest
    {
        if ($request->status !== 'pending') {
            throw ValidationException::withMessages(['request' => 'این درخواست قبلاً بررسی شده است.']);
        }

        $request->forceFill([
            'status'        => 'rejected',
            'reject_reason' => $reason,
            'reviewed_by'   => $actor?->getKey(),
            'reviewed_at'   => Carbon::now('UTC'),
        ])->save();

        $this->audit->log('license.reject', 'رد درخواست فعال‌سازی', 'ActivationRequest', $request->getKey(), null, ['reason' => $reason]);

        return $request;
    }

    /**
     * مصرف کد یک‌بارمصرف و قفل کردن آن به fingerprint دستگاه.
     *
     * @param array<string, mixed> $systemInfo
     * @return array{license: License, device: Device, token: string}
     */
    public function redeemCode(string $plainCode, string $fingerprint, array $systemInfo, ?string $appVersion, ?string $ip): array
    {
        return DB::transaction(function () use ($plainCode, $fingerprint, $systemInfo, $appVersion, $ip): array {
            $code = \Modules\License\Models\LicenseCode::query()
                ->where('code_hash', $this->codes->hash($plainCode))
                ->lockForUpdate()
                ->first();

            if ($code === null || ! $code->isRedeemable()) {
            $this->audit->security('invalid_license_code', 'کد فعال‌سازی نامعتبر یا مصرف‌شده', [
                'fingerprint' => $fingerprint,
                'prefix'      => mb_substr($this->codes->normalize($plainCode), 0, 7),
            ]);

            throw ValidationException::withMessages(['code' => 'کد نامعتبر یا مصرف‌شده است.']);
        }

        if (Device::query()->where('fingerprint', $fingerprint)->exists()) {
            $this->audit->security('duplicate_activation', 'تلاش فعال‌سازی مجدد روی دستگاه فعال', [
                'fingerprint' => $fingerprint,
            ]);

            throw ValidationException::withMessages(['fingerprint' => 'این دستگاه قبلاً فعال شده است.']);
        }

            $customerId = $code->customer_id ?? Customer::query()->create([
                'name'   => $systemInfo['hostname'] ?? 'مشتری ثبت‌نشده',
                'status' => 'active',
                'notes'  => 'ایجادشده هنگام مصرف کد یک‌بارمصرف',
            ])->getKey();

            $license = $this->licenses->issue($customerId, $code->plan_id, $code->duration_type, null, 'مصرف کد یک‌بارمصرف');
            $device  = $this->licenses->activate($license, $fingerprint, $systemInfo, $appVersion, $ip);

            $this->codes->markUsed($code, $license->getKey(), $fingerprint);

            return [
                'license' => $license->refresh(),
                'device'  => $device,
                'token'   => $this->tokens->issue($license->refresh(), $device),
            ];
        });
     }
}