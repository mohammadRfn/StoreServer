<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Admin\Http\Requests\StoreRoleRequest;
use Modules\Admin\Models\Role;
use Modules\Admin\Services\RbacService;
use Modules\Audit\Services\AuditLogger;

class RoleController extends Controller
{
    public function __construct(
        private readonly RbacService $rbac,
        private readonly AuditLogger $audit,
    ) {}

    public function index(): InertiaResponse
    {
        return Inertia::render('Admin/Roles/Index', [
            'roles'       => Role::query()->with('permissions:id,name,title,group')->orderBy('id')->get(),
            'permissions' => $this->rbac->groupedPermissions(),
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $role = Role::query()->create([
            'name'        => $request->string('name')->toString(),
            'title'       => $request->string('title')->toString(),
            'description' => $request->input('description'),
            'is_system'   => false,
        ]);

        $this->rbac->syncPermissions($role, (array) $request->input('permissions', []));
        $this->audit->log('role.create', 'ایجاد نقش', 'Role', $role->getKey(), null, $role->only('name', 'title'));

        return back()->with('success', 'نقش ایجاد شد.');
    }

    public function update(StoreRoleRequest $request, Role $role): RedirectResponse
    {
        $old = $role->only('name', 'title', 'description');

        $role->update([
            'name'        => $role->is_system ? $role->name : $request->string('name')->toString(),
            'title'       => $request->string('title')->toString(),
            'description' => $request->input('description'),
        ]);

        $this->rbac->syncPermissions($role, (array) $request->input('permissions', []));
        $this->audit->log('role.update', 'ویرایش نقش', 'Role', $role->getKey(), $old, $role->only('name', 'title', 'description'));

        return back()->with('success', 'نقش به‌روزرسانی شد.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->is_system) {
            throw ValidationException::withMessages(['role' => 'نقش سیستمی قابل حذف نیست.']);
        }

        if ($role->admins()->exists()) {
            throw ValidationException::withMessages(['role' => 'ابتدا ادمین‌های این نقش را جابه‌جا کنید.']);
        }

        $this->audit->log('role.delete', 'حذف نقش', 'Role', $role->getKey(), $role->only('name', 'title'));
        $role->permissions()->detach();
        $role->delete();

        return back()->with('success', 'نقش حذف شد.');
    }
}
