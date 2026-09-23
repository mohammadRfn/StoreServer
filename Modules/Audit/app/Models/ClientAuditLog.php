<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\License\Models\Device;
use Modules\License\Models\License;

// جدول فقط‌افزودنی؛ آینه‌ی رکورد ارسالی گیم‌استور (Modules\AuditLog\Services\LogPayloadBuilder)
class ClientAuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'client_audit_logs';

    protected $fillable = [
        'license_id', 'device_id', 'batch_id', 'uuid',
        'channel', 'level', 'action', 'description',
        'entity_type', 'entity_id', 'entity_label',
        'actor_id', 'actor_type', 'actor_name', 'actor_email',
        'request_id', 'correlation_id', 'session_id', 'method', 'route', 'url',
        'ip', 'user_agent', 'status_code', 'duration_ms', 'memory_kb',
        'old_values', 'new_values', 'changed_keys', 'context', 'tags',
        'environment', 'app_version', 'hostname',
        'sequence', 'hash', 'previous_hash',
        'occurred_at', 'received_at',
    ];

    protected $casts = [
        'old_values'   => 'array',
        'new_values'   => 'array',
        'changed_keys' => 'array',
        'context'      => 'array',
        'tags'         => 'array',
        'entity_id'    => 'integer',
        'status_code'  => 'integer',
        'duration_ms'  => 'integer',
        'memory_kb'    => 'integer',
        'sequence'     => 'integer',
        'occurred_at'  => 'datetime',
        'received_at'  => 'datetime',
        'created_at'   => 'datetime',
    ];

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class, 'device_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ClientAuditBatch::class, 'batch_id');
    }
}