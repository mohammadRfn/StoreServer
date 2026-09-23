<?php

declare(strict_types=1);

namespace Modules\AuditLog\Support;

use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * هویت این نصب از گیم‌استور؛ در هدرها و بدنه‌ی ارسال به StoreServer
 * استفاده می‌شود تا سرور بداند لاگ از کدام فروشگاه/دستگاه آمده است.
 */
class ClientIdentity
{
    private const CACHE_KEY = 'auditlog:client-identity';

    public function environment(): string
    {
        return (string) config('app.env', 'production');
    }

    public function appVersion(): string
    {
        return (string) config('app.version', env('APP_VERSION', '1.0.0'));
    }

    public function hostname(): string
    {
        return mb_substr((string) (gethostname() ?: 'unknown'), 0, 191);
    }

    public function licenseUuid(): ?string
    {
        return config('auditlog.shipping.auth.license_uuid') ?: null;
    }

    public function licenseToken(): ?string
    {
        return config('auditlog.shipping.auth.license_token') ?: null;
    }

    /**
     * اثر انگشت دستگاه؛ اگر در کانفیگ تعریف نشده باشد از مشخصات ماشین ساخته می‌شود.
     */
    public function fingerprint(): string
    {
        $configured = (string) (config('auditlog.shipping.auth.fingerprint') ?? '');

        if ($configured !== '') {
            return $configured;
        }

        return Cache::rememberForever(self::CACHE_KEY, function (): string {
            $parts = [
                php_uname('n'),
                php_uname('s'),
                php_uname('m'),
                (string) config('app.key'),
                base_path(),
            ];

            return hash('sha256', implode('|', $parts));
        });
    }

    /**
     * اطلاعات فروشگاه برای غنی‌سازی payload (اختیاری، در صورت وجود ماژول Profile).
     *
     * @return array<string, mixed>
     */
    public function storeProfile(): array
    {
        $class = '\\Modules\\Profile\\Models\\StoreProfile';

        if (! class_exists($class)) {
            return [];
        }

        try {
            /** @var \Illuminate\Database\Eloquent\Model|null $profile */
            $profile = $class::query()->first();

            if ($profile === null) {
                return [];
            }

            return array_filter([
                'id'    => $profile->getKey(),
                'name'  => $profile->getAttribute('name') ?? $profile->getAttribute('store_name'),
                'phone' => $profile->getAttribute('phone'),
                'city'  => $profile->getAttribute('city'),
            ], static fn ($value) => $value !== null);
        } catch (Throwable) {
            return [];
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'app'              => 'gamestore',
            'app_version'      => $this->appVersion(),
            'environment'      => $this->environment(),
            'hostname'         => $this->hostname(),
            'fingerprint'      => $this->fingerprint(),
            'license_uuid'     => $this->licenseUuid(),
            'php_version'      => PHP_VERSION,
            'laravel_version'  => app()->version(),
            'timezone'         => (string) config('app.timezone', 'UTC'),
            'store'            => $this->storeProfile(),
        ];
    }
}