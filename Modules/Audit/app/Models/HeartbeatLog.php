<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\License\Models\Device;
use Modules\License\Models\License;

class HeartbeatLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'heartbeat_logs';

    protected $fillable = [
        'license_id', 'device_id', 'app_version', 'license_status',
        'plan_code', 'modules_used',
        'patches_offered', 'token_refreshed', 'ip', 'duration_ms',
    ];

    protected $casts = [
        'modules_used'    => 'array',
        'patches_offered' => 'integer',
        'token_refreshed' => 'boolean',
        'duration_ms'     => 'integer',
        'created_at'      => 'datetime',
    ];

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }
}
