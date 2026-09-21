<?php

declare(strict_types=1);

namespace Modules\License\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\License\Console\ExpireDueLicensesCommand;
use Modules\License\Console\ExpireLicenseCodesCommand;
use Modules\License\Models\License;
use Modules\License\Policies\LicensePolicy;
use Modules\License\Services\ActivationService;
use Modules\License\Services\LicenseCodeService;
use Modules\License\Services\LicenseService;
use Modules\License\Services\TokenService;

class LicenseServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'License';

    public function register(): void
    {
        $this->app->singleton(TokenService::class);
        $this->app->singleton(LicenseService::class);
        $this->app->singleton(LicenseCodeService::class);
        $this->app->singleton(ActivationService::class);
    }

    public function boot(): void
    {
        $this->commands([
            ExpireDueLicensesCommand::class,
            ExpireLicenseCodesCommand::class,
        ]);

        Gate::policy(License::class, LicensePolicy::class);

        Route::middleware('web')->group(module_path($this->moduleName, 'routes/web.php'));
    }
}
