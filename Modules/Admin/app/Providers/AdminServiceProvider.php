<?php

declare(strict_types=1);

namespace Modules\Admin\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Modules\Admin\Models\Permission;
use Modules\Admin\Policies\AdminPolicy;
use Modules\Admin\Services\RbacService;
use Throwable;

class AdminServiceProvider extends ServiceProvider
{
    protected string $moduleName = 'Admin';

    public function register(): void
    {
        $this->app->singleton(RbacService::class);
    }

    public function boot(): void
    {
        $this->registerGates();
        $this->registerPolicies();
        $this->loadRoutes();
    }

    // یک Gate به ازای هر مجوز + دسترسی کامل super_admin
    private function registerGates(): void
    {
        Gate::before(function (User $user) {
            return $user->is_active && $user->hasRole('super_admin') ? true : null;
        });

        try {
            if (! Schema::hasTable('permissions')) {
                return;
            }

            foreach (Permission::query()->pluck('name') as $permission) {
                Gate::define($permission, fn (User $user) => $user->is_active && $user->hasPermission($permission));
            }
        } catch (Throwable) {
            // در زمان نصب اولیه ممکن است جدول موجود نباشد
        }
    }

    private function registerPolicies(): void
    {
        Gate::policy(User::class, AdminPolicy::class);
    }

    private function loadRoutes(): void
    {
        Route::middleware('web')->group(module_path($this->moduleName, 'routes/web.php'));
    }
}
