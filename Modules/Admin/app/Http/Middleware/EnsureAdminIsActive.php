<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

// ادمین غیرفعال بلافاصله از سامانه خارج می‌شود
class EnsureAdminIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user !== null && ! $user->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('admin.login')
                ->withErrors(['email' => 'حساب کاربری شما غیرفعال شده است.']);
        }

        return $next($request);
    }
}
