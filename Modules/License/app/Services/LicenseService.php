<?php

declare(strict_types=1);

namespace Modules\License\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Support\SemVer;
use Modules\License\Models\Device;
use Modules\License\Models\License;
use Modules\License\Models\LicenseModuleOverride;
use Modules\License\Models\LicensePlanHistory;
use Modules\Plan\Models\Plan;

// منطق چرخه عمر لایسنس: صدور، فعال‌سازی، تمدید، تغییر پلن، suspend، revoke، override
class LicenseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function issue(int $customerId, int $planId, string $durationType, ?User $actor = null, ?string $note = null): License
    {
        $license = License::query()->create([
            'customer_id'   => $customerId,
            'plan_id'       => $planId,
            'status'        => License::STATUS_UNACTIVATED,
            'duration_type' => $durationType,
            'note'          => $note,
            'issued_by'     => $actor?->getKey(),
        ]);

        $this->history($license, 'issue', null, $planId, null, null, $actor, $note);
        $this->audit->log('license.issue', 'صدور لایسنس جدید', 'License', $license->getKey(), null, $license->toArray());
        $this->audit->license($license, 'license.issued', 'لایسنس صادر شد');

        return $license;
    }

    /**
     * فعال‌سازی لایسنس و اتصال دائمی به یک دستگاه.
     * سرور هرگز fingerprint ناشناس را خودکار به لایسنس فعال متصل نمی‌کند؛
     * این متد فقط از مسیر تأیید ادمین یا مصرف کد فراخوانی می‌شود.
     *
     * @param array<string, mixed> $systemInfo
     */
    public function activate(License $license, string $fingerprint, array $systemInfo, ?string $appVersion, ?string $ip): Device
    {
        return DB::transaction(function () use ($license, $fingerprint, $systemInfo, $appVersion, $ip): Device {
            $existing = Device::query()->where('fingerprint', $fingerprint)->first();

            if ($existing !== null && $existing->license_id !== $license->getKey()) {
                throw ValidationException::withMessages([
                    'fingerprint' => 'این دستگاه قبلاً به لایسنس دیگری متصل شده است. جابه‌جایی ممکن نیست.',
                ]);
            }

            if ($license->device()->exists() && $existing === null) {
                throw ValidationException::withMessages([
                    'license' => 'این لایسنس قبلاً به دستگاه دیگری متصل شده است.',
                ]);
            }

            $now = Carbon::now('UTC');

            $device = Device::query()->updateOrCreate(
                ['license_id' => $license->getKey()],
                [
                    'fingerprint'        => $fingerprint,
                    'hostname'           => $systemInfo['hostname'] ?? null,
                    'os'                 => $systemInfo['os'] ?? null,
                    'os_version'         => $systemInfo['os_version'] ?? null,
                    'cpu'                => $systemInfo['cpu'] ?? null,
                    'motherboard_serial' => $systemInfo['motherboard_serial'] ?? null,
                    'disk_serial'        => $systemInfo['disk_serial'] ?? null,
                    'mac_address'        => $systemInfo['mac_address'] ?? null,
                    'ram_mb'             => isset($systemInfo['ram_mb']) ? (int) $systemInfo['ram_mb'] : null,
                    'timezone'           => $systemInfo['timezone'] ?? null,
                    'app_version'        => $appVersion,
                    'app_version_code'   => SemVer::toCode($appVersion),
                    'last_ip'            => $ip,
                    'system_info'        => $systemInfo,
                    'first_seen_at'      => $now,
                    'last_heartbeat_at'  => $now,
                ],
            );

            $license->forceFill([
                'status'       => License::STATUS_ACTIVE,
                'activated_at' => $license->activated_at ?? $now,
                'expires_at'   => $this->calculateExpiry($license->duration_type, $license->activated_at ?? $now),
                'last_seen_at' => $now,
            ])->save();

            $this->history($license, 'activate', $license->plan_id, $license->plan_id, null, $license->expires_at, null, 'فعال‌سازی روی دستگاه');
            $this->audit->license($license, 'license.activated', 'لایسنس روی دستگاه فعال شد', ['fingerprint' => $fingerprint], $device);

            return $device;
        });
    }

    public function renew(License $license, string $durationType, ?User $actor = null, ?string $note = null): License
    {
        $from = $license->expires_at !== null && $license->expires_at->isFuture()
            ? $license->expires_at
            : Carbon::now('UTC');

        $oldExpires = $license->expires_at;

        $license->forceFill([
            'duration_type' => $durationType,
            'expires_at'    => $this->calculateExpiry($durationType, $from),
            'status'        => $license->status === License::STATUS_EXPIRED ? License::STATUS_ACTIVE : $license->status,
        ])->save();

        $this->history($license, 'renew', $license->plan_id, $license->plan_id, $oldExpires, $license->expires_at, $actor, $note);
        $this->audit->log('license.renew', 'تمدید لایسنس', 'License', $license->getKey(), ['expires_at' => $oldExpires], ['expires_at' => $license->expires_at]);
        $this->audit->license($license, 'license.renewed', 'لایسنس تمدید شد');

        return $license;
    }

    public function changePlan(License $license, Plan $plan, ?User $actor = null, ?string $note = null): License
    {
        $oldPlanId = $license->plan_id;
        $license->forceFill(['plan_id' => $plan->getKey()])->save();

        $this->history($license, 'plan_change', $oldPlanId, $plan->getKey(), $license->expires_at, $license->expires_at, $actor, $note);
        $this->audit->log('license.change_plan', 'تغییر پلن لایسنس', 'License', $license->getKey(), ['plan_id' => $oldPlanId], ['plan_id' => $plan->getKey()]);
        $this->audit->license($license, 'license.plan_changed', 'پلن لایسنس تغییر کرد', ['from' => $oldPlanId, 'to' => $plan->getKey()]);

        return $license;
    }

    public function suspend(License $license, string $reason, ?User $actor = null): License
    {
        $license->forceFill([
            'status'         => License::STATUS_SUSPENDED,
            'suspended_at'   => Carbon::now('UTC'),
            'suspend_reason' => $reason,
        ])->save();

        $this->history($license, 'suspend', $license->plan_id, $license->plan_id, $license->expires_at, $license->expires_at, $actor, $reason);
        $this->audit->log('license.suspend', 'غیرفعال‌سازی لایسنس', 'License', $license->getKey(), null, ['reason' => $reason]);
        $this->audit->license($license, 'license.suspended', 'لایسنس غیرفعال شد', ['reason' => $reason], null, 'warning');

        return $license;
    }

    public function reactivate(License $license, ?User $actor = null): License
    {
        if ($license->status === License::STATUS_REVOKED) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'license' => 'لایسنس باطل‌شده قابل احیا نیست؛ لایسنس جدید صادر کنید.',
            ]);
        }

        $status = $license->expires_at !== null && $license->expires_at->isPast()
            ? License::STATUS_EXPIRED
            : ($license->activated_at === null ? License::STATUS_UNACTIVATED : License::STATUS_ACTIVE);

        $license->forceFill([
            'status'         => $status,
            'suspended_at'   => null,
            'suspend_reason' => null,
        ])->save();

        $this->history($license, 'reactivate', $license->plan_id, $license->plan_id, $license->expires_at, $license->expires_at, $actor, null);
        $this->audit->log('license.reactivate', 'فعال‌سازی مجدد لایسنس', 'License', $license->getKey());
        $this->audit->license($license, 'license.reactivated', 'لایسنس دوباره فعال شد');

        return $license;
    }

    public function revoke(License $license, string $reason, ?User $actor = null): License
    {
        $license->forceFill([
            'status'        => License::STATUS_REVOKED,
            'revoked_at'    => Carbon::now('UTC'),
            'revoke_reason' => $reason,
        ])->save();

        $this->history($license, 'revoke', $license->plan_id, $license->plan_id, $license->expires_at, $license->expires_at, $actor, $reason);
        $this->audit->log('license.revoke', 'ابطال لایسنس', 'License', $license->getKey(), null, ['reason' => $reason]);
        $this->audit->license($license, 'license.revoked', 'لایسنس باطل شد', ['reason' => $reason], null, 'critical');

        return $license;
    }

    public function setModuleOverride(License $license, int $moduleId, bool $enabled, ?string $reason, ?User $actor = null): LicenseModuleOverride
    {
        $override = LicenseModuleOverride::query()->updateOrCreate(
            ['license_id' => $license->getKey(), 'module_id' => $moduleId],
            ['enabled' => $enabled, 'reason' => $reason, 'created_by' => $actor?->getKey()],
        );

        $this->history($license, 'override', $license->plan_id, $license->plan_id, $license->expires_at, $license->expires_at, $actor, $reason);
        $this->audit->log('license.override', 'تغییر استثنای ماژول', 'License', $license->getKey(), null, $override->toArray());

        return $override;
    }

    public function expireDue(): int
    {
        $due = License::query()
            ->where('status', License::STATUS_ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', Carbon::now('UTC'))
            ->get();

        foreach ($due as $license) {
            $license->forceFill(['status' => License::STATUS_EXPIRED])->save();
            $this->history($license, 'expire', $license->plan_id, $license->plan_id, $license->expires_at, $license->expires_at, null, 'انقضای خودکار');
            $this->audit->license($license, 'license.expired', 'لایسنس منقضی شد', [], null, 'warning');
        }

        return $due->count();
    }

    public function calculateExpiry(string $durationType, Carbon $from): ?Carbon
    {
        return match ($durationType) {
            'monthly'   => $from->copy()->addMonth(),
            'yearly'    => $from->copy()->addYear(),
            'permanent' => null,
            default     => $from->copy()->addYear(),
        };
    }

    private function history(
        License $license,
        string $action,
        ?int $fromPlan,
        ?int $toPlan,
        ?Carbon $fromExpires,
        ?Carbon $toExpires,
        ?User $actor,
        ?string $note,
    ): void {
        LicensePlanHistory::query()->create([
            'license_id'      => $license->getKey(),
            'action'          => $action,
            'from_plan_id'    => $fromPlan,
            'to_plan_id'      => $toPlan,
            'from_expires_at' => $fromExpires,
            'to_expires_at'   => $toExpires,
            'performed_by'    => $actor?->getKey(),
            'note'            => $note,
            'created_at'      => Carbon::now('UTC'),
        ]);
    }
}
