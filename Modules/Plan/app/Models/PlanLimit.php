<?php

declare(strict_types=1);

namespace Modules\Plan\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanLimit extends Model
{
    protected $table = 'plan_limits';

    protected $fillable = ['plan_id', 'limit_key', 'limit_value'];

    protected $casts = [
        'plan_id'     => 'integer',
        'limit_value' => 'integer',
        'created_at'  => 'datetime',
        'updated_at'  => 'datetime',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }
}
