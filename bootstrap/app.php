<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Modules\Admin\Http\Middleware\EnsureAdminIsActive;
use Modules\Admin\Http\Middleware\EnsurePermission;
use Modules\Audit\Http\Middleware\LogApiRequest;
use Modules\ClientApi\Http\Middleware\AuthenticateLicenseToken;
use Modules\ClientApi\Http\Middleware\DecodeGzipPayload;
use Modules\ClientApi\Http\Middleware\VerifyClientSignature;
use Modules\ClientApi\Http\Middleware\VerifySignedPatchLink;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        // فعال‌سازی روت‌های API نسخه v1 کلاینت GameShop
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(fn () => route('admin.login'));

        // میدلورهای وب (Inertia از قبل ثبت شده است)
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // گروه api اختصاصی کلاینت: لاگ درخواست + محدودیت نرخ
        $middleware->api(prepend: [
            LogApiRequest::class,
        ]);

        // نام‌های کوتاه میدلورها
        $middleware->alias([
            'permission'    => EnsurePermission::class,
            'admin.active'  => EnsureAdminIsActive::class,
            'license.token' => AuthenticateLicenseToken::class,
            'client.sig'    => VerifyClientSignature::class,
            'patch.link'    => VerifySignedPatchLink::class,
            'api.log'       => LogApiRequest::class,
            'gzip.decode'   => DecodeGzipPayload::class,
        ]);

        $middleware->trustProxies(at: ['127.0.0.1', '::1']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ثبت خطاها در جدول error_logs علاوه بر لاگ پیش‌فرض
        $exceptions->reportable(function (Throwable $e) {
            try {
                app(\Modules\Audit\Services\AuditLogger::class)->error($e);
            } catch (Throwable) {
                // در صورت خطای لاگ‌گیری، جریان اصلی نباید مختل شود
            }
        });

        // پاسخ یکسان JSON برای مسیرهای api
        $exceptions->render(function (Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                return \Modules\ClientApi\Support\ApiResponse::fromException($e);
            }

            return null;
        });
    })->create();