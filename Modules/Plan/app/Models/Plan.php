<?php

declare(strict_types=1);

namespace Modules\Plan\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\License\Models\License;

/**
 * @property string $code
 * @property string $name
 */
class Plan extends Model
{
    protected $table = 'plans';

    protected $fillable = [
        'code', 'name', 'description', 'price_irr', 'default_duration',
        'is_active', 'sort_order', 'created_by',
    ];

    protected $casts = [
        'price_irr'  => 'integer',
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(GameshopModule::class, 'plan_modules', 'plan_id', 'module_id')
            ->withPivot('enabled')
            ->withTimestamps();
    }

    public function limits(): HasMany
    {
        return $this->hasMany(PlanLimit::class, 'plan_id');
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(License::class, 'plan_id');
    }

    public function getRouteKeyName(): string
    {
        return 'code';
    }
}
