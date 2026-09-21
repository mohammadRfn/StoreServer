<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Admin\Http\Requests\LoginRequest;
use Modules\Audit\Services\AuditLogger;

class AuthController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function showLogin(): InertiaResponse
    {
        return Inertia::render('Admin/Auth/Login');
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $credentials = $request->only('email', 'password');
        /** @var User|null $user */
        $user = User::query()->where('email', $credentials['email'])->first();

        if ($user !== null && ! $user->is_active) {
            $this->audit->security('admin_login_inactive', 'تلاش ورود حساب غیرفعال', [
                'email' => $credentials['email'],
            ]);

            throw ValidationException::withMessages(['email' => 'حساب کاربری شما غیرفعال است.']);
        }

        if (! Auth::guard('web')->attempt($credentials, (bool) $request->boolean('remember'))) {
            $this->audit->security('admin_login_failed', 'ورود ناموفق ادمین', [
                'email' => $credentials['email'],
            ]);

            throw ValidationException::withMessages(['email' => 'ایمیل یا گذرواژه نادرست است.']);
        }

        $request->session()->regenerate();

        /** @var User $authenticated */
        $authenticated = Auth::user();
        $authenticated->forceFill([
            'last_login_at' => now()->utc(),
            'last_login_ip' => $request->ip(),
        ])->save();
        $authenticated->forgetPermissionCache();

        $this->audit->log('admin.login', 'ورود موفق به پنل', 'User', $authenticated->getKey());

        return redirect()->intended(route('admin.dashboard'));
    }

    public function logout(Request $request): RedirectResponse
    {
        $this->audit->log('admin.logout', 'خروج از پنل', 'User', $request->user()?->getKey());

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }

    public function dashboard(): InertiaResponse
    {
        return Inertia::render('Admin/Dashboard');
    }
}
