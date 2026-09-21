<?php

declare(strict_types=1);

namespace Modules\Base\Support;

// کدگذاری base64url بدون padding مطابق RFC 7515
final class Base64Url
{
    public static function encode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    public static function decode(string $value): string
    {
        $padded = strtr($value, '-_', '+/');
        $remainder = strlen($padded) % 4;

        if ($remainder !== 0) {
            $padded .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode($padded, true);

        return $decoded === false ? '' : $decoded;
    }

    public static function encodeJson(array $data): string
    {
        return self::encode((string) json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    public static function decodeJson(string $value): ?array
    {
        $decoded = json_decode(self::decode($value), true);

        return is_array($decoded) ? $decoded : null;
    }
}
