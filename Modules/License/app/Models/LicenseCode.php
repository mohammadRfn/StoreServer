<?php

declare(strict_types=1);

namespace Modules\License\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Customer\Models\Customer;
use Modules\Plan\Models\Plan;

/**
 * کد یک‌بارمصرف؛ فقط هش SHA-256 ذخیره می‌شود و کد خام هرگز در دیتابیس نیست
 *
 * @property string $code_hash
 * @property string $status
 */
class LicenseCode extends Model
{
    protected $table = 'license_codes';

    protected $fillable = [
        'code_hash', 'code_prefix', 'customer_id', 'plan_id', 'duration_type',
        'status', 'expires_at', 'used_at', 'used_license_id', 'used_fingerprint', 'created_by',
    ];

    protected $hidden = ['code_hash'];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at'    => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'used_license_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isRedeemable(): bool
    {
        return $this->status === 'unused'
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
