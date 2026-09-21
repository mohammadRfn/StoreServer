<?php

declare(strict_types=1);

namespace Modules\Patch\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Patch\Console\PublishScheduledPatchesCommand;
use Modules\Patch\Services\PatchDeliveryService;
use Modules\Patch\Services\PatchPublishService;
use Modules\Patch\Services\PatchUploadService;

class PatchServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'Patch';

    public function register(): void
    {
        $this->app->singleton(PatchUploadService::class);
        $this->app->singleton(PatchPublishService::class);
        $this->app->singleton(PatchDeliveryService::class);
    }

    public function boot(): void
    {
        $this->commands([PublishScheduledPatchesCommand::class]);

        Route::middleware('web')->group(module_path($this->moduleName, 'routes/web.php'));
    }
}
