<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;

class ApiRequestLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'api_request_logs';

    protected $fillable = [
        'request_id', 'method', 'path', 'status_code', 'error_code',
        'license_id', 'fingerprint', 'ip', 'user_agent', 'duration_ms', 'payload',
    ];

    protected $casts = [
        'payload'     => 'array',
        'status_code' => 'integer',
        'duration_ms' => 'integer',
        'created_at'  => 'datetime',
    ];
}
