<?php

declare(strict_types=1);

namespace Modules\License\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Modules\Base\Services\ServerSettings;
use Modules\Base\Services\SignerService;
use Modules\Base\Support\Base64Url;
use Modules\License\Models\Device;
use Modules\License\Models\License;
use Modules\Plan\Services\EntitlementService;

// صدور و راستی‌آزمایی توکن compact سه‌بخشی: header.payload.signature با Ed25519
class TokenService
{
    public function __construct(
        private readonly SignerService $signer,
        private readonly ServerSettings $settings,
        private readonly EntitlementService $entitlements,
    ) {}

    public function issue(License $license, Device $device): string
    {
        $license->loadMissing(['plan', 'moduleOverrides.module']);

        $now        = Carbon::now('UTC');
        $validUntil = $now->copy()->addDays($this->settings->offlineGraceDays());
        $kid        = $this->signer->activeKid();

        $header = [
            'alg' => $this->signer->algorithm(),
            'typ' => (string) config('licensing.token.type', 'GSL'),
            'kid' => $kid,
        ];

        $payload = [
            'license_uuid' => $license->uuid,
            'fingerprint'  => $device->fingerprint,
            'plan'         => $license->plan?->code,
            'entitlements' => $this->entitlements->forLicense($license),
            'limits'       => $this->entitlements->limitsForLicense($license),
            'issued_at'    => $now->getTimestamp(),
            'expires_at'   => $license->isPermanent() ? null : $license->expires_at?->getTimestamp(),
            'valid_until'  => $validUntil->getTimestamp(),
            'nonce'        => (string) Str::uuid(),
            'iss'          => (string) config('licensing.token.issuer'),
            'aud'          => (string) config('licensing.token.audience'),
        ];

        $signingInput = Base64Url::encodeJson($header) . '.' . Base64Url::encodeJson($payload);

        return $signingInput . '.' . $this->signer->sign($signingInput);
    }

    /**
     * راستی‌آزمایی توکن.
     *
     * @return array{valid: bool, reason?: string, header?: array<string,mixed>, payload?: array<string,mixed>}
     */
    public function verify(string $token, bool $allowExpired = false): array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return ['valid' => false, 'reason' => 'TOKEN_INVALID'];
        }

        [$headerPart, $payloadPart, $signaturePart] = $parts;

        $header  = Base64Url::decodeJson($headerPart);
        $payload = Base64Url::decodeJson($payloadPart);

        if ($header === null || $payload === null || ! isset($header['kid'])) {
            return ['valid' => false, 'reason' => 'TOKEN_INVALID'];
        }

        if (! $this->signer->verify("{$headerPart}.{$payloadPart}", $signaturePart, (string) $header['kid'])) {
            return ['valid' => false, 'reason' => 'TOKEN_INVALID'];
        }

        $validUntil = (int) ($payload['valid_until'] ?? 0);

        if (! $allowExpired && $validUntil > 0 && $validUntil < Carbon::now('UTC')->getTimestamp()) {
            return ['valid' => false, 'reason' => 'TOKEN_EXPIRED', 'header' => $header, 'payload' => $payload];
        }

        return ['valid' => true, 'header' => $header, 'payload' => $payload];
    }

    public function validUntilFor(?Carbon $from = null): Carbon
    {
        return ($from ?? Carbon::now('UTC'))->copy()->addDays($this->settings->offlineGraceDays());
    }
}
