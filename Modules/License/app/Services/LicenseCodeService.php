<?php

declare(strict_types=1);

namespace Modules\License\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Modules\Audit\Services\AuditLogger;
use Modules\License\Models\LicenseCode;

// تولید و مصرف کدهای یک‌بارمصرف؛ کد خام فقط یک‌بار به ادمین نشان داده می‌شود
class LicenseCodeService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @return array{model: LicenseCode, plain_code: string} */
    public function generate(int $planId, string $durationType, ?int $customerId, ?int $ttlDays, ?User $actor = null): array
    {
        $plain = $this->randomCode();
        $hash  = $this->hash($plain);

        $code = LicenseCode::query()->create([
            'code_hash'     => $hash,
            'code_prefix'   => mb_substr($plain, 0, 7),
            'customer_id'   => $customerId,
            'plan_id'       => $planId,
            'duration_type' => $durationType,
            'status'        => 'unused',
            'expires_at'    => $ttlDays === null ? null : Carbon::now('UTC')->addDays($ttlDays),
            'created_by'    => $actor?->getKey(),
        ]);

        $this->audit->log('license.code_issue', 'صدور کد یک‌بارمصرف', 'LicenseCode', $code->getKey(), null, [
            'plan_id' => $planId, 'duration_type' => $durationType, 'prefix' => $code->code_prefix,
        ]);

        // کد خام فقط همین‌جا بازگردانده می‌شود و دیگر قابل بازیابی نیست
        return ['model' => $code, 'plain_code' => $plain];
    }

    public function findRedeemable(string $plainCode): ?LicenseCode
    {
        $code = LicenseCode::query()->where('code_hash', $this->hash($this->normalize($plainCode)))->first();

        return $code?->isRedeemable() === true ? $code : null;
    }

    public function markUsed(LicenseCode $code, int $licenseId, string $fingerprint): void
    {
        $code->forceFill([
            'status'           => 'used',
            'used_at'          => Carbon::now('UTC'),
            'used_license_id'  => $licenseId,
            'used_fingerprint' => $fingerprint,
        ])->save();
    }

    public function revoke(LicenseCode $code, ?User $actor = null): void
    {
        $code->forceFill(['status' => 'revoked'])->save();
        $this->audit->log('license.code_revoke', 'ابطال کد یک‌بارمصرف', 'LicenseCode', $code->getKey());
    }

    public function expireDue(): int
    {
        return LicenseCode::query()
            ->where('status', 'unused')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', Carbon::now('UTC'))
            ->update(['status' => 'expired', 'updated_at' => Carbon::now('UTC')]);
    }

    public function hash(string $plainCode): string
    {
        return hash('sha256', $this->normalize($plainCode));
    }

    public function normalize(string $plainCode): string
    {
        return mb_strtoupper(trim($plainCode));
    }

    private function randomCode(): string
    {
        $alphabet = (string) config('licensing.codes.alphabet');
        $groups   = (int) config('licensing.codes.groups', 4);
        $length   = (int) config('licensing.codes.group_length', 4);
        $parts    = [(string) config('licensing.codes.prefix', 'GS')];

        for ($g = 0; $g < $groups; $g++) {
            $chunk = '';
            for ($i = 0; $i < $length; $i++) {
                $chunk .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $parts[] = $chunk;
        }

        return implode('-', $parts);
    }
}