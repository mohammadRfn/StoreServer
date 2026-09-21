<?php

declare(strict_types=1);

namespace Modules\Base\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Base\Console\GenerateKeypairCommand;
use Modules\Base\Services\ServerSettings;
use Modules\Base\Services\SignerService;

class BaseServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'Base';

    public function register(): void
    {
        $this->app->singleton(ServerSettings::class);
        $this->app->singleton(SignerService::class);
    }

    public function boot(): void
    {
        $this->commands([GenerateKeypairCommand::class]);

        $this->registerPatchDisk();
        $this->registerRateLimiters();
        $this->loadRoutes();
    }

    // دیسک خصوصی نگهداری بسته‌های پچ
    private function registerPatchDisk(): void
    {
        $disk = (string) config('licensing.patch.disk', 'patches');

        if (config("filesystems.disks.{$disk}") === null) {
            config([
                "filesystems.disks.{$disk}" => [
                    'driver' => 'local',
                    'root'   => storage_path('app/private/patches'),
                    'throw'  => false,
                ],
            ]);
        }
    }

    // محدودکننده نرخ مخصوص API کلاینت
    private function registerRateLimiters(): void
    {
        RateLimiter::for('client-api', function (Request $request) {
            $settings = app(ServerSettings::class);
            $perMinute = $settings->int('client_api_rate_limit', (int) config('licensing.security.rate_limit_per_minute', 60));
            $key = (string) ($request->header('X-GS-Fingerprint') ?: $request->ip());

            return [
                Limit::perMinute(max(10, $perMinute))->by('client-api:' . $key),
                Limit::perMinute(max(60, $perMinute * 5))->by('client-api-ip:' . $request->ip()),
            ];
        });

        RateLimiter::for('admin-login', function (Request $request) {
            $email = (string) $request->input('email');

            return [
                Limit::perMinute(5)->by('login:' . mb_strtolower($email) . '|' . $request->ip()),
                Limit::perMinute(20)->by('login-ip:' . $request->ip()),
            ];
        });
    }

    private function loadRoutes(): void
    {
        Route::middleware('web')->group(module_path($this->moduleName, 'routes/web.php'));
    }
}
