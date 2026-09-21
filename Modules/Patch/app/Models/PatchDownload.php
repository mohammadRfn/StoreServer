<?php

declare(strict_types=1);

namespace Modules\Patch\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\License\Models\Device;
use Modules\License\Models\License;

class PatchDownload extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'patch_downloads';

    protected $fillable = [
        'patch_id', 'device_id', 'license_id', 'ip', 'user_agent',
        'range_header', 'bytes_sent', 'status',
    ];

    protected $casts = [
        'bytes_sent' => 'integer',
        'created_at' => 'datetime',
    ];

    public function patch(): BelongsTo
    {
        return $this->belongsTo(Patch::class, 'patch_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }
}
