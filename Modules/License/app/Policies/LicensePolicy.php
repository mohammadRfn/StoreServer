<?php

declare(strict_types=1);

namespace Modules\License\Policies;

use App\Models\User;
use Modules\License\Models\License;

class LicensePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('license.view');
    }

    public function view(User $user, License $license): bool
    {
        return $user->hasPermission('license.view');
    }

    public function issue(User $user): bool
    {
        return $user->hasPermission('license.issue');
    }

    public function approve(User $user): bool
    {
        return $user->hasPermission('license.approve');
    }

    public function suspend(User $user, License $license): bool
    {
        return $user->hasPermission('license.suspend');
    }

    public function renew(User $user, License $license): bool
    {
        return $user->hasPermission('license.renew');
    }

    public function changePlan(User $user, License $license): bool
    {
        return $user->hasPermission('license.change_plan');
    }

    public function revoke(User $user, License $license): bool
    {
        return $user->hasPermission('license.revoke');
    }
}
