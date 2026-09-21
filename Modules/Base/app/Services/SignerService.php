<?php

declare(strict_types=1);

namespace Modules\Base\Services;

use Modules\Base\Models\SigningKey;
use Modules\Base\Support\Base64Url;
use RuntimeException;

// سرویس امضا و راستی‌آزمایی Ed25519 (sodium)
// کلید خصوصی فقط از فایل خارج از webroot و از طریق config خوانده می‌شود
class SignerService
{
    private ?string $privateKey = null;

    public function algorithm(): string
    {
        return (string) config('licensing.algorithm', 'EdDSA');
    }

    // kid کلید فعال: اول از config، سپس از جدول signing_keys
    public function activeKid(): string
    {
        $configured = config('licensing.keys.active_kid');

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        $kid = SigningKey::query()->active()->orderByDesc('id')->value('kid');

        if (! is_string($kid) || $kid === '') {
            throw new RuntimeException('هیچ کلید امضای فعالی یافت نشد. دستور licensing:generate-keypair را اجرا کنید.');
        }

        return $kid;
    }

    public function sign(string $payload): string
    {
        return Base64Url::encode(sodium_crypto_sign_detached($payload, $this->privateKey()));
    }

    public function verify(string $payload, string $signatureB64Url, ?string $kid = null): bool
    {
        $publicKey = $this->publicKeyRaw($kid);

        if ($publicKey === null) {
            return false;
        }

        $signature = Base64Url::decode($signatureB64Url);

        if (strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES) {
            return false;
        }

        return sodium_crypto_sign_verify_detached($signature, $payload, $publicKey);
    }

    public function publicKeyRaw(?string $kid = null): ?string
    {
        $kid ??= $this->activeKid();

        $encoded = SigningKey::query()->where('kid', $kid)->value('public_key');

        if (! is_string($encoded) || $encoded === '') {
            return null;
        }

        $raw = Base64Url::decode($encoded);

        return strlen($raw) === SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES ? $raw : null;
    }

    // تولید جفت کلید جدید و ثبت کلید عمومی در دیتابیس
    /** @return array{kid: string, public_key: string, private_key_path: string, public_key_path: string} */
    public function generateKeypair(?string $kid = null, bool $activate = true): array
    {
        $kid ??= 'k-' . now()->utc()->format('Ymd-His');

        $keypair    = sodium_crypto_sign_keypair();
        $secret     = sodium_crypto_sign_secretkey($keypair);
        $public     = sodium_crypto_sign_publickey($keypair);
        $publicB64  = Base64Url::encode($public);

        $directory = (string) config('licensing.keys.path');

        if (! is_dir($directory)) {
            mkdir($directory, 0700, true);
        }

        $privatePath = rtrim($directory, '/') . "/{$kid}.key";
        $publicPath  = rtrim($directory, '/') . "/{$kid}.pub";

        file_put_contents($privatePath, Base64Url::encode($secret));
        chmod($privatePath, 0600);
        file_put_contents($publicPath, $publicB64);
        chmod($publicPath, 0644);

        if ($activate) {
            SigningKey::query()->where('status', 'active')->update([
                'status'     => 'retired',
                'retired_at' => now()->utc(),
            ]);
        }

        SigningKey::query()->updateOrCreate(['kid' => $kid], [
            'algorithm'    => $this->algorithm(),
            'public_key'   => $publicB64,
            'fingerprint'  => hash('sha256', $public),
            'status'       => $activate ? 'active' : 'retired',
            'activated_at' => $activate ? now()->utc() : null,
        ]);

        sodium_memzero($secret);

        return [
            'kid'              => $kid,
            'public_key'       => $publicB64,
            'private_key_path' => $privatePath,
            'public_key_path'  => $publicPath,
        ];
    }

    // بارگذاری کلید خصوصی از مسیر فایل (هرگز از دیتابیس)
    private function privateKey(): string
    {
        if ($this->privateKey !== null) {
            return $this->privateKey;
        }

        $configured = config('licensing.keys.private_key');
        $path = is_string($configured) && $configured !== ''
            ? $configured
            : rtrim((string) config('licensing.keys.path'), '/') . '/' . $this->activeKid() . '.key';

        if (! is_string($path) || ! is_file($path)) {
            throw new RuntimeException("فایل کلید خصوصی یافت نشد: {$path}");
        }

        $raw = Base64Url::decode(trim((string) file_get_contents($path)));

        if (strlen($raw) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
            throw new RuntimeException('کلید خصوصی معتبر نیست.');
        }

        return $this->privateKey = $raw;
    }
}
