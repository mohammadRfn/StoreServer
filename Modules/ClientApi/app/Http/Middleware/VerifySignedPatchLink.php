<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Audit\Services\AuditLogger;
use Modules\ClientApi\Support\ApiResponse;
use Symfony\Component\HttpFoundation\Response;

// بررسی لینک امضاشده کوتاه‌مدت دانلود پچ
class VerifySignedPatchLink
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasValidSignature()) {
            $expires = (int) $request->query('expires', '0');
            $expired = $expires > 0 && $expires < now()->utc()->getTimestamp();

            $this->audit->security('invalid_signed_link', 'لینک دانلود نامعتبر یا منقضی', [
                'endpoint' => $request->path(),
                'expired'  => $expired,
            ]);

            return $expired
                ? ApiResponse::error('LINK_EXPIRED', 'لینک دانلود منقضی شده است.', 410)
                : ApiResponse::error('BAD_REQUEST', 'لینک دانلود معتبر نیست.', 400);
        }

        return $next($request);
    }
}
