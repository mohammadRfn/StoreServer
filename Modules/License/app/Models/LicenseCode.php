<?php

declare(strict_types=1);

namespace Modules\License\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Customer\Models\Customer;
use Modules\Plan\Models\Plan;

/**
 * کد یک‌بارمصرف؛ هش SHA-256 برای اعتبارسنجی سریع نگه داشته می‌شود و نسخه‌ی خام
 * علاوه بر آن، رمزنگاری‌شده (با کلید اپ) در code_plain ذخیره می‌شود تا در پنل ادمین
 * همیشه قابل نمایش کامل باشد؛ کدهای قدیمی‌تر از این تغییر مقدار code_plain ندارند
 *
 * @property string $code_hash
 * @property string|null $code_plain
 * @property string $status
 */
class LicenseCode extends Model
{
    protected $table = 'license_codes';

    protected $fillable = [
        'code_hash', 'code_plain', 'code_prefix', 'customer_id', 'plan_id', 'duration_type',
        'status', 'expires_at', 'used_at', 'used_license_id', 'used_fingerprint', 'created_by',
    ];

    protected $hidden = ['code_hash'];

    protected $casts = [
        'code_plain' => 'encrypted',
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