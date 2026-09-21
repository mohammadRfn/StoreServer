<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Admin\Http\Requests\StoreAdminRequest;
use Modules\Admin\Models\Role;
use Modules\Admin\Services\RbacService;
use Modules\Audit\Services\AuditLogger;

class AdminController extends Controller
{
    public function __construct(
        private readonly RbacService $rbac,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $admins = User::query()
            ->with('roles:id,name,title')
            ->when($request->string('q')->toString() !== '', function ($query) use ($request): void {
                $term = '%' . $request->string('q')->toString() . '%';
                $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('email', 'like', $term));
            })
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Admins/Index', [
            'admins' => $admins,
            'roles'  => Role::query()->orderBy('id')->get(['id', 'name', 'title']),
            'filters' => ['q' => $request->string('q')->toString()],
        ]);
    }

    public function store(StoreAdminRequest $request): RedirectResponse
    {
        $admin = User::query()->create([
            'name'      => $request->string('name')->toString(),
            'email'     => $request->string('email')->toString(),
            'phone'     => $request->input('phone'),
            'password'  => Hash::make((string) $request->input('password')),
            'is_active' => $request->boolean('is_active', true),
        ]);

        $this->rbac->syncRoles($admin, (array) $request->input('roles', []));
        $this->audit->log('admin.create', 'ایجاد ادمین جدید', 'User', $admin->getKey(), null, $admin->only('name', 'email', 'is_active'));

        return back()->with('success', 'ادمین جدید ایجاد شد.');
    }

    public function update(StoreAdminRequest $request, User $admin): RedirectResponse
    {
        $old = $admin->only('name', 'email', 'is_active');

        $admin->fill([
            'name'  => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'phone' => $request->input('phone'),
        ]);

        if ($request->filled('password')) {
            $admin->password = Hash::make((string) $request->input('password'));
        }

        if ($request->has('is_active') && ! $request->boolean('is_active')) {
            $this->rbac->deactivate($admin);
            $admin->refresh();
        } elseif ($request->has('is_active')) {
            $admin->is_active = true;
        }

        $admin->save();

        if ($request->has('roles')) {
            $this->rbac->syncRoles($admin, (array) $request->input('roles', []));
        }

        $this->audit->log('admin.update', 'ویرایش ادمین', 'User', $admin->getKey(), $old, $admin->only('name', 'email', 'is_active'));

        return back()->with('success', 'اطلاعات ادمین به‌روزرسانی شد.');
    }

    public function destroy(User $admin): RedirectResponse
    {
        $this->rbac->delete($admin);
        $this->audit->log('admin.delete', 'حذف ادمین', 'User', $admin->getKey());

        return back()->with('success', 'ادمین حذف شد.');
    }
}
