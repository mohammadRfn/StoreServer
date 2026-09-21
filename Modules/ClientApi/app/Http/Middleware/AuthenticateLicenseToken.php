<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Audit\Services\AuditLogger;
use Modules\ClientApi\Support\ApiResponse;
use Modules\License\Models\Device;
use Modules\License\Models\License;
use Modules\License\Services\TokenService;
use Symfony\Component\HttpFoundation\Response;

// احراز هویت با توکن لایسنس؛ هر mismatch رویداد امنیتی ثبت می‌کند
class AuthenticateLicenseToken
{
    public function __construct(
        private readonly TokenService $tokens,
        private readonly AuditLogger $audit,
    ) {}

    public function handle(Request $request, Closure $next, string $mode = 'strict'): Response
    {
        $token = $request->bearerToken();

        if ($token === null || $token === '') {
            return ApiResponse::error('TOKEN_MISSING', 'توکن لایسنس ارسال نشده است.', 401);
        }

        $result = $this->tokens->verify($token, $mode === 'allow_expired');

        if (! ($result['valid'] ?? false)) {
            $reason = (string) ($result['reason'] ?? 'TOKEN_INVALID');

            $this->audit->security('invalid_token', 'توکن نامعتبر یا منقضی', [
                'reason'   => $reason,
                'endpoint' => $request->path(),
            ]);

            return ApiResponse::error(
                $reason,
                $reason === 'TOKEN_EXPIRED' ? 'اعتبار توکن به پایان رسیده است.' : 'توکن نامعتبر است.',
                401,
            );
        }

        /** @var array<string, mixed> $payload */
        $payload = $result['payload'];

        $license = License::query()->with(['plan', 'device'])->where('uuid', $payload['license_uuid'] ?? '')->first();

        if ($license === null) {
            return ApiResponse::error('NOT_FOUND', 'لایسنس یافت نشد.', 404);
        }

        /** @var Device|null $device */
        $device = $license->device;

        $headerFingerprint = (string) $request->header('X-GS-Fingerprint', '');
        $tokenFingerprint  = (string) ($payload['fingerprint'] ?? '');

        // جابه‌جایی ممنوع است: هر ناهمخوانی رد و ثبت می‌شود
        if ($device === null || $device->fingerprint !== $tokenFingerprint
            || ($headerFingerprint !== '' && $headerFingerprint !== $tokenFingerprint)) {
            $this->audit->security('fingerprint_mismatch', 'تلاش استفاده از لایسنس روی دستگاه دیگر', [
                'license_uuid'       => $license->uuid,
                'token_fingerprint'  => $tokenFingerprint,
                'header_fingerprint' => $headerFingerprint,
                'endpoint'           => $request->path(),
            ], 'critical', $license, $device);

            return ApiResponse::error('FINGERPRINT_MISMATCH', 'این لایسنس به دستگاه دیگری تعلق دارد.', 403);
        }

        $request->attributes->set('license', $license);
        $request->attributes->set('device', $device);
        $request->attributes->set('token_payload', $payload);

        return $next($request);
    }
}
