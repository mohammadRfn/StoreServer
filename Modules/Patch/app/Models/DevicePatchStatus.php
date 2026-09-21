<?php

declare(strict_types=1);

namespace Modules\Patch\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\License\Models\Device;

/**
 * @property int $failure_count
 * @property bool $is_blocked
 */
class DevicePatchStatus extends Model
{
    protected $table = 'device_patch_statuses';

    protected $fillable = [
        'device_id', 'patch_id', 'status', 'attempts', 'failure_count', 'is_blocked',
        'error_message', 'version_before', 'version_after',
        'offered_at', 'applied_at', 'last_reported_at',
    ];

    protected $casts = [
        'device_id'        => 'integer',
        'patch_id'         => 'integer',
        'attempts'         => 'integer',
        'failure_count'    => 'integer',
        'is_blocked'       => 'boolean',
        'offered_at'       => 'datetime',
        'applied_at'       => 'datetime',
        'last_reported_at' => 'datetime',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function patch(): BelongsTo
    {
        return $this->belongsTo(Patch::class, 'patch_id');
    }
}
