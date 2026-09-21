<?php

declare(strict_types=1);

namespace Modules\Customer\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class CustomerServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'Customer';

    public function boot(): void
    {
        Route::middleware('web')->group(module_path($this->moduleName, 'routes/web.php'));
    }
}
