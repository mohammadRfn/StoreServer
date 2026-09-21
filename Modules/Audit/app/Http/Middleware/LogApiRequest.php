<?php

declare(strict_types=1);

namespace Modules\Audit\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Modules\Audit\Services\AuditLogger;
use Modules\License\Models\License;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

// لاگ ساختاریافته همه درخواست‌های API کلاینت
class LogApiRequest
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handle(Request $request, Closure $next): Response
    {
        $requestId = (string) Str::uuid();
        $request->attributes->set('request_id', $requestId);
        $startedAt = microtime(true);

        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        try {
            /** @var License|null $license */
            $license = $request->attributes->get('license');

            $this->audit->apiRequest([
                'request_id'  => $requestId,
                'method'      => $request->method(),
                'path'        => mb_substr($request->path(), 0, 255),
                'status_code' => $response->getStatusCode(),
                'error_code'  => $this->errorCode($response),
                'license_id'  => $license?->getKey(),
                'fingerprint' => mb_substr((string) $request->header('X-GS-Fingerprint'), 0, 64) ?: null,
                'ip'          => $request->ip(),
                'user_agent'  => mb_substr((string) $request->userAgent(), 0, 255),
                'duration_ms' => (int) ((microtime(true) - $startedAt) * 1000),
                'payload'     => $this->summarize($request),
            ]);
        } catch (Throwable) {
            // خطای لاگ‌گیری نباید پاسخ را مختل کند
        }

        return $response;
    }

    private function errorCode(Response $response): ?string
    {
        $content = $response->getContent();

        if ($content === false || $content === '' || $response->isSuccessful()) {
            return null;
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) ? ($decoded['error']['code'] ?? null) : null;
    }

    /** @return array<string, mixed> خلاصه بدون داده حساس */
    private function summarize(Request $request): array
    {
        $input = $request->except(['code', 'password', 'token', 'system_info']);

        return [
            'keys'        => array_keys($request->all()),
            'app_version' => $request->input('app_version', $request->header('X-GS-App-Version')),
            'status'      => $input['status'] ?? null,
        ];
    }
}
