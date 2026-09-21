<?php

declare(strict_types=1);

namespace Modules\Plan\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanModule extends Model
{
    protected $table = 'plan_modules';

    protected $fillable = ['plan_id', 'module_id', 'enabled'];

    protected $casts = [
        'plan_id'    => 'integer',
        'module_id'  => 'integer',
        'enabled'    => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(GameshopModule::class, 'module_id');
    }
}
