<?php

declare(strict_types=1);

namespace Modules\Customer\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Modules\License\Models\License;

/**
 * @property string $uuid
 * @property string $name
 */
class Customer extends Model
{
    protected $table = 'customers';

    protected $fillable = [
        'uuid', 'name', 'company', 'phone', 'email', 'national_id',
        'province', 'city', 'address', 'notes', 'status', 'created_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Customer $customer): void {
            $customer->uuid = $customer->uuid ?: (string) Str::uuid();
        });
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(License::class, 'customer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
