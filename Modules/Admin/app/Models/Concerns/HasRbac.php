<?php

declare(strict_types=1);

namespace Modules\Admin\Models\Concerns;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;
use Modules\Admin\Models\Role;

// امکانات RBAC برای مدل User (ادمین‌ها همان جدول users هستند)
trait HasRbac
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'admin_role', 'user_id', 'role_id')
            ->withPivot('assigned_at');
    }

    /** @return array<int, string> مجوز نهایی = اجتماع مجوزهای همه نقش‌ها */
    public function permissionNames(): array
    {
        return Cache::remember(
            "storeserver:permissions:user:{$this->getKey()}",
            300,
            fn (): array => $this->roles()
                ->with('permissions:id,name')
                ->get()
                ->flatMap(fn (Role $role) => $role->permissions->pluck('name'))
                ->unique()
                ->values()
                ->all(),
        );
    }

    /** @return array<int, string> */
    public function roleNames(): array
    {
        return $this->roles()->pluck('name')->all();
    }

    public function hasRole(string $role): bool
    {
        return in_array($role, $this->roleNames(), true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function hasPermission(string $permission): bool
    {
        return $this->isSuperAdmin() || in_array($permission, $this->permissionNames(), true);
    }

    public function forgetPermissionCache(): void
    {
        Cache::forget("storeserver:permissions:user:{$this->getKey()}");
    }
}
