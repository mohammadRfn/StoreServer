<?php

declare(strict_types=1);

namespace Modules\Plan\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Plan\Services\EntitlementService;

class PlanServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'Plan';

    public function register(): void
    {
        $this->app->singleton(EntitlementService::class);
    }

    public function boot(): void
    {
        Route::middleware('web')->group(module_path($this->moduleName, 'routes/web.php'));
    }
}
