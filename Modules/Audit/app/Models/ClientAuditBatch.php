<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\License\Models\Device;
use Modules\License\Models\License;

// یک دسته (batch) لاگ دریافتی از کلاینت گیم‌استور؛ برای idempotency روی batch.uuid
class ClientAuditBatch extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'client_audit_batches';

    protected $fillable = [
        'license_id', 'device_id', 'uuid', 'schema_version', 'client_app_version',
        'log_count', 'accepted_count', 'rejected_count', 'checksum',
        'payload_bytes', 'ip', 'received_at',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'created_at'  => 'datetime',
    ];

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ClientAuditLog::class, 'batch_id');
    }
}