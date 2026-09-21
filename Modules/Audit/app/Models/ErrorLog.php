<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;

class ErrorLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'error_logs';

    protected $fillable = [
        'level', 'message', 'exception_class', 'file', 'line', 'context', 'request_id',
    ];

    protected $casts = [
        'context'    => 'array',
        'line'       => 'integer',
        'created_at' => 'datetime',
    ];
}
