<?php

declare(strict_types=1);

namespace Modules\License\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Patch\Models\DevicePatchStatus;

/**
 * هر دستگاه فقط یک لایسنس دارد و هر لایسنس فقط یک دستگاه
 *
 * @property string $fingerprint
 * @property int $app_version_code
 */
class Device extends Model
{
    protected $table = 'devices';

    protected $fillable = [
        'license_id', 'fingerprint', 'hostname', 'os', 'os_version', 'cpu',
        'motherboard_serial', 'disk_serial', 'mac_address', 'ram_mb', 'timezone',
        'app_version', 'app_version_code', 'last_ip', 'system_info',
        'first_seen_at', 'last_heartbeat_at',
    ];

    protected $casts = [
        'system_info'       => 'array',
        'ram_mb'            => 'integer',
        'app_version_code'  => 'integer',
        'first_seen_at'     => 'datetime',
        'last_heartbeat_at' => 'datetime',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
    ];

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }

    public function patchStatuses(): HasMany
    {
        return $this->hasMany(DevicePatchStatus::class, 'device_id');
    }

    public function moduleUsage(): HasMany
    {
        return $this->hasMany(DeviceModuleUsage::class, 'device_id');
    }
}
