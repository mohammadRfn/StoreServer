<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;

// سیاست مدیریت ادمین‌ها؛ منطق نهایی روی مجوز admin.manage است
class AdminPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('admin.manage');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('admin.manage');
    }

    public function update(User $user, User $target): bool
    {
        return $user->hasPermission('admin.manage');
    }

    public function delete(User $user, User $target): bool
    {
        // ادمین نمی‌تواند خودش را حذف کند
        return $user->hasPermission('admin.manage') && $user->getKey() !== $target->getKey();
    }
}
