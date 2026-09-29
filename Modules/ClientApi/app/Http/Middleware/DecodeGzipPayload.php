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
    private const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024; // بدنه‌ی فشرده
    private const MAX_DECODED_BYTES = 10 * 1024 * 1024;   // پس از باز شدن

    public function handle(Request $request, Closure $next): Response
    {
        if (strtolower((string) $request->header('Content-Encoding')) !== 'gzip') {
            return $next($request);
        }

        $compressed = $request->getContent();

        if (strlen($compressed) > self::MAX_COMPRESSED_BYTES) {
            return ApiResponse::error('PAYLOAD_TOO_LARGE', 'بدنه‌ی فشرده بزرگ‌تر از حد مجاز است.', 413);
        }

        // سقف حجم پس از باز شدن؛ جلوی gzip bomb را می‌گیرد
        $decoded = @gzdecode($compressed, self::MAX_DECODED_BYTES);

        if ($decoded === false) {
            return ApiResponse::error('BAD_REQUEST', 'بدنه‌ی gzip نامعتبر است یا از سقف حجم مجاز بزرگ‌تر است.', 400);
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