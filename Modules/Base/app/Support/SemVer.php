<?php

declare(strict_types=1);

namespace Modules\Base\Support;

// تبدیل نسخه semver به کد عددی برای مقایسه در SQL
final class SemVer
{
    public static function isValid(?string $version): bool
    {
        return is_string($version) && preg_match('/^\d{1,3}\.\d{1,3}\.\d{1,3}$/', $version) === 1;
    }

    // major*1000000 + minor*1000 + patch
    public static function toCode(?string $version): int
    {
        if (! self::isValid($version)) {
            return 0;
        }

        [$major, $minor, $patch] = array_map('intval', explode('.', (string) $version));

        return ($major * 1000000) + ($minor * 1000) + $patch;
    }

    public static function fromCode(int $code): string
    {
        $major = intdiv($code, 1000000);
        $minor = intdiv($code % 1000000, 1000);
        $patch = $code % 1000;

        return "{$major}.{$minor}.{$patch}";
    }

    public static function gte(string $a, string $b): bool
    {
        return self::toCode($a) >= self::toCode($b);
    }
}
