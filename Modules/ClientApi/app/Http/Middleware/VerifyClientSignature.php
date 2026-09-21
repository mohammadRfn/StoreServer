<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Services\ServerSettings;
use Modules\ClientApi\Support\ApiResponse;
use Symfony\Component\HttpFoundation\Response;

// جلوگیری از replay: بررسی X-GS-Timestamp و یکتا بودن X-GS-Nonce در کش
class VerifyClientSignature
{
    public function __construct(
        private readonly ServerSettings $settings,
        private readonly AuditLogger $audit,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $timestamp = (int) $request->header('X-GS-Timestamp');
        $nonce     = (string) $request->header('X-GS-Nonce');

        if ($timestamp <= 0 || $nonce === '' || mb_strlen($nonce) < 16 || mb_strlen($nonce) > 64) {
            return ApiResponse::error('BAD_REQUEST', 'هدرهای X-GS-Timestamp و X-GS-Nonce الزامی هستند.', 400);
        }

        $window = $this->settings->replayWindowSeconds();

        if (abs(now()->utc()->getTimestamp() - $timestamp) > $window) {
            $this->audit->security('clock_skew', 'اختلاف زمانی بیش از حد مجاز', [
                'timestamp' => $timestamp,
                'endpoint'  => $request->path(),
            ]);

            return ApiResponse::error('CLOCK_SKEW', 'ساعت دستگاه با سرور هماهنگ نیست.', 419, ['allowed_skew' => $window]);
        }

        $cacheKey = (string) config('licensing.security.nonce_cache_prefix', 'gsl:nonce:') . hash('sha256', $nonce);

        if (! Cache::add($cacheKey, 1, (int) config('licensing.security.nonce_ttl_seconds', 600))) {
            $this->audit->security('replay_detected', 'استفاده مجدد از nonce', [
                'endpoint' => $request->path(),
            ]);

            return ApiResponse::error('REPLAY_DETECTED', 'این درخواست قبلاً پردازش شده است.', 409);
        }

        return $next($request);
    }
}
