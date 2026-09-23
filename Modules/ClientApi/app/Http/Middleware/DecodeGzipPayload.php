<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\ClientApi\Support\ApiResponse;
use Symfony\Component\HttpFoundation\Response;

// گیم‌استور بدنه‌های بزرگ را با Content-Encoding: gzip می‌فرستد (Modules\AuditLog\Services\StoreServerClient::encode)
class DecodeGzipPayload
{
    public function handle(Request $request, Closure $next): Response
    {
        if (strtolower((string) $request->header('Content-Encoding')) !== 'gzip') {
            return $next($request);
        }

        $decoded = @gzdecode($request->getContent());

        if ($decoded === false) {
            return ApiResponse::error('BAD_REQUEST', 'بدنه‌ی gzip قابل رمزگشایی نیست.', 400);
        }

        /** @var mixed $json */
        $json = json_decode($decoded, true);

        if (! is_array($json)) {
            return ApiResponse::error('BAD_REQUEST', 'بدنه‌ی JSON پس از رمزگشایی معتبر نیست.', 400);
        }

        $request->attributes->set('raw_payload_bytes', strlen($decoded));
        $request->replace($json);

        return $next($request);
    }
}