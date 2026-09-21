<?php

declare(strict_types=1);

namespace Modules\License\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Plan\Models\Plan;

class LicensePlanHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'license_plan_history';

    protected $fillable = [
        'license_id', 'action', 'from_plan_id', 'to_plan_id',
        'from_expires_at', 'to_expires_at', 'performed_by', 'note',
    ];

    protected $casts = [
        'from_expires_at' => 'datetime',
        'to_expires_at'   => 'datetime',
        'created_at'      => 'datetime',
    ];

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }

    public function fromPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'from_plan_id');
    }

    public function toPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'to_plan_id');
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
