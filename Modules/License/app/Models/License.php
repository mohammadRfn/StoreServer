<?php

declare(strict_types=1);

namespace Modules\License\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;
use Modules\Customer\Models\Customer;
use Modules\Plan\Models\Plan;

/**
 * @property string $uuid
 * @property string $status
 * @property string $duration_type
 * @property \Illuminate\Support\Carbon|null $expires_at
 */
class License extends Model
{
    public const STATUS_UNACTIVATED = 'unactivated';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_REVOKED = 'revoked';

    protected $table = 'licenses';

    protected $fillable = [
        'uuid', 'customer_id', 'plan_id', 'status', 'duration_type',
        'activated_at', 'expires_at', 'suspended_at', 'suspend_reason',
        'revoked_at', 'revoke_reason', 'last_seen_at', 'note', 'issued_by',
    ];

    protected $casts = [
        'activated_at' => 'datetime',
        'expires_at'   => 'datetime',
        'suspended_at' => 'datetime',
        'revoked_at'   => 'datetime',
        'last_seen_at' => 'datetime',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (License $license): void {
            $license->uuid = $license->uuid ?: (string) Str::uuid();
        });
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function device(): HasOne
    {
        return $this->hasOne(Device::class, 'license_id');
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function moduleOverrides(): HasMany
    {
        return $this->hasMany(LicenseModuleOverride::class, 'license_id');
    }

    public function history(): HasMany
    {
        return $this->hasMany(LicensePlanHistory::class, 'license_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    // لایسنس دائمی است؟
    public function isPermanent(): bool
    {
        return $this->duration_type === 'permanent' || $this->expires_at === null;
    }

    public function isUsable(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && ($this->isPermanent() || $this->expires_at?->isFuture() === true);
    }

    public function isLocked(): bool
    {
        return in_array($this->status, [self::STATUS_SUSPENDED, self::STATUS_EXPIRED, self::STATUS_REVOKED], true);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
