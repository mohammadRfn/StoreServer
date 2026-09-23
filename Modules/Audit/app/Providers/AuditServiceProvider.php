<?php

declare(strict_types=1);

namespace Modules\Audit\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Audit\Console\PruneLogsCommand;
use Modules\Audit\Services\AuditLogger;

class AuditServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'Audit';

    public function register(): void
    {
        $this->app->singleton(AuditLogger::class);
    }

    public function boot(): void
    {
        $this->commands([PruneLogsCommand::class]);

        Route::middleware('web')->group(module_path($this->moduleName, 'routes/web.php'));
    }
}