<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// جدول فقط‌افزودنی؛ به‌روزرسانی رکوردها مجاز نیست
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'audit_logs';

    protected $fillable = [
        'user_id', 'user_name', 'action', 'entity_type', 'entity_id',
        'description', 'old_values', 'new_values', 'ip', 'user_agent', 'request_id',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'entity_id'  => 'integer',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
