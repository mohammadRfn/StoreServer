<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\License\Models\Device;
use Modules\License\Models\License;

class LicenseEventLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'license_event_logs';

    protected $fillable = ['license_id', 'device_id', 'event', 'severity', 'message', 'context', 'ip'];

    protected $casts = [
        'context'    => 'array',
        'created_at' => 'datetime',
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
