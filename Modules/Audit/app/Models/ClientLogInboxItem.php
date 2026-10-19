<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\License\Models\Device;
use Modules\License\Models\License;

// یک دسته‌ی لاگ دریافت‌شده که منتظر پردازش (یا پردازش‌شده) است
class ClientLogInboxItem extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_DONE = 'done';
    public const STATUS_FAILED = 'failed'; // تلاش ناموفق؛ منتظر retry بعدی
    public const STATUS_DEAD = 'dead';     // تلاش‌ها تمام شد؛ فقط retry دستی

    /** ستون‌های سبک برای لیست پنل (بدون payload) */
    public const LIST_COLUMNS = [
        'id', 'license_id', 'device_id', 'batch_uuid', 'payload_bytes', 'stored_bytes', 'log_count', 'ip',
        'status', 'attempts', 'next_attempt_at', 'last_error', 'accepted_count', 'rejected_count',
        'rejected_reasons', 'processed_at', 'created_at',
    ];

    protected $table = 'client_log_inbox';

    protected $fillable = [
        'license_id', 'device_id', 'batch_uuid', 'payload', 'payload_bytes', 'stored_bytes', 'log_count',
        'ip', 'status', 'attempts', 'next_attempt_at', 'locked_at', 'last_error', 'accepted_count',
        'rejected_count', 'rejected_reasons', 'processed_at',
    ];

    protected $hidden = ['payload'];

    protected $casts = [
        'next_attempt_at'  => 'datetime',
        'locked_at'        => 'datetime',
        'processed_at'     => 'datetime',
        'rejected_reasons' => 'array',
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