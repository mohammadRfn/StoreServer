<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * فرانت‌اند (resources/js) به این سه کلید وابسته است:
     *  - app   : نام و محیط برنامه (نمایش در Topbar)
     *  - auth  : کاربر لاگین‌شده به‌همراه نقش‌ها و مجوزها (برای مخفی‌کردن منو و دکمه‌ها)
     *  - flash : پیام‌های session که به Toast تبدیل می‌شوند (+ plain_codes برای کدهای یک‌بارمصرف)
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        return [
            ...parent::share($request),

            'app' => [
                'name' => config('app.name', 'StoreServer'),
                'env'  => app()->environment(),
            ],

            'auth' => [
                'user' => $user ? [
                    'id'             => $user->getKey(),
                    'name'           => $user->name,
                    'email'          => $user->email,
                    'phone'          => $user->phone,
                    'is_active'      => (bool) $user->is_active,
                    'last_login_at'  => $user->last_login_at?->toIso8601String(),
                    'last_login_ip'  => $user->last_login_ip,
                    'roles'          => $user->roleNames(),
                    'permissions'    => $user->permissionNames(),
                    'is_super_admin' => $user->isSuperAdmin(),
                ] : null,
            ],

            'flash' => fn () => [
                'success'     => $request->session()->get('success'),
                'error'       => $request->session()->get('error'),
                'warning'     => $request->session()->get('warning'),
                'info'        => $request->session()->get('info'),
                'plain_codes' => $request->session()->get('plain_codes'),
            ],
        ];
    }
}
