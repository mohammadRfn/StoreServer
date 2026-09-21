<?php

declare(strict_types=1);

namespace Modules\ClientApi\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class ClientApiServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'ClientApi';

    public function boot(): void
    {
        Route::middleware('api')
            ->prefix('api')
            ->group(module_path($this->moduleName, 'routes/api.php'));
    }
}
