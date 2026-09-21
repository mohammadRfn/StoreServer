<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// بررسی مجوز: permission:license.view یا permission:license.view,license.issue (منطق OR)
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        /** @var User|null $user */
        $user = $request->user();

        if ($user === null) {
            abort(401, 'ابتدا وارد شوید.');
        }

        if (! $user->is_active) {
            abort(403, 'حساب ادمین غیرفعال است.');
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        abort(403, 'شما مجوز لازم برای این عملیات را ندارید.');
    }
}
