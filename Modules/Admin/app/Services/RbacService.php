<?php

declare(strict_types=1);

namespace Modules\Admin\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Admin\Models\Permission;
use Modules\Admin\Models\Role;

class RbacService
{
    /** @param array<int, int> $roleIds */
    public function syncRoles(User $user, array $roleIds): void
    {
        $this->guardLastSuperAdmin($user, $roleIds);

        $payload = [];
        foreach (array_unique($roleIds) as $roleId) {
            $payload[(int) $roleId] = ['assigned_at' => now()->utc()];
        }

        $user->roles()->sync($payload);
        $user->forgetPermissionCache();
    }

    /** @param array<int, int> $permissionIds */
    public function syncPermissions(Role $role, array $permissionIds): void
    {
        $role->permissions()->sync(array_values(array_unique(array_map('intval', $permissionIds))));

        // کش مجوز همه ادمین‌های این نقش باید پاک شود
        $role->admins()->get()->each(fn (User $admin) => $admin->forgetPermissionCache());
    }

    public function deactivate(User $user): void
    {
        $this->guardLastSuperAdmin($user, []);

        $user->forceFill(['is_active' => false])->save();
        $user->forgetPermissionCache();
    }

    public function delete(User $user): void
    {
        $this->guardLastSuperAdmin($user, []);

        $user->roles()->detach();
        $user->forgetPermissionCache();
        $user->delete();
    }

    /** @return array<string, array<int, Permission>> */
    public function groupedPermissions(): array
    {
        return Permission::query()
            ->orderBy('group')
            ->orderBy('name')
            ->get()
            ->groupBy('group')
            ->map(fn ($items) => $items->values()->all())
            ->all();
    }

    // آخرین super_admin نباید حذف یا غیرفعال یا از نقش خارج شود
    /** @param array<int, int> $newRoleIds */
    private function guardLastSuperAdmin(User $user, array $newRoleIds): void
    {
        if (! $user->hasRole('super_admin')) {
            return;
        }

        $superRoleId = (int) Role::query()->where('name', 'super_admin')->value('id');

        if (in_array($superRoleId, array_map('intval', $newRoleIds), true)) {
            return;
        }

        $activeSuperAdmins = DB::table('admin_role')
            ->join('users', 'users.id', '=', 'admin_role.user_id')
            ->where('admin_role.role_id', $superRoleId)
            ->where('users.is_active', 1)
            ->count();

        if ($activeSuperAdmins <= 1) {
            throw ValidationException::withMessages([
                'roles' => 'آخرین مدیر ارشد فعال قابل حذف، غیرفعال‌سازی یا تغییر نقش نیست.',
            ]);
        }
    }
}
