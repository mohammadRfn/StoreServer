<?php

declare(strict_types=1);

namespace Modules\License\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * آخرین وضعیت مصرف هر ماژول روی هر دستگاه؛ از heartbeat به‌روزرسانی می‌شود.
 * برخلاف heartbeat_logs (تاریخچه‌ی رویدادها)، این جدول فقط وضعیت جاری را نگه می‌دارد.
 */
class DeviceModuleUsage extends Model
{
    protected $table = 'device_module_usage';

    protected $fillable = ['device_id', 'module_key', 'use_count', 'first_used_at', 'last_used_at'];

    protected $casts = [
        'device_id'     => 'integer',
        'use_count'     => 'integer',
        'first_used_at' => 'datetime',
        'last_used_at'  => 'datetime',
        'created_at'    => 'datetime',
        'updated_at'    => 'datetime',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }
}