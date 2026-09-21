<?php

declare(strict_types=1);

namespace Modules\Plan\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * کاتالوگ ماژول‌های نرم‌افزار GameShop
 *
 * @property string $key
 * @property bool $is_core
 */
class GameshopModule extends Model
{
    protected $table = 'gameshop_modules';

    protected $fillable = ['key', 'title', 'description', 'is_core', 'sort_order', 'is_active'];

    protected $casts = [
        'is_core'    => 'boolean',
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_modules', 'module_id', 'plan_id')
            ->withPivot('enabled');
    }

    public function scopeCore(Builder $query): Builder
    {
        return $query->where('is_core', true);
    }
}
