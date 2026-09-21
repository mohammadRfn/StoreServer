<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property string $name
 * @property bool $is_system
 */
class Role extends Model
{
    protected $table = 'roles';

    protected $fillable = ['name', 'title', 'description', 'is_system'];

    protected $casts = [
        'is_system'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permission', 'role_id', 'permission_id');
    }

    public function admins(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'admin_role', 'role_id', 'user_id')
            ->withPivot('assigned_at');
    }
}
