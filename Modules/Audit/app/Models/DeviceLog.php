<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\License\Models\Device;

class DeviceLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'device_logs';

    protected $fillable = ['device_id', 'event', 'message', 'context', 'ip'];

    protected $casts = [
        'context'    => 'array',
        'created_at' => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }
}
