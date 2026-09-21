<?php

declare(strict_types=1);

namespace Modules\License\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * @property string $uuid
 * @property string $status
 * @property string $fingerprint
 */
class ActivationRequest extends Model
{
    protected $table = 'activation_requests';

    protected $fillable = [
        'uuid', 'fingerprint', 'customer_name', 'customer_phone', 'app_version',
        'app_version_code', 'system_info', 'request_ip', 'status', 'license_id',
        'reviewed_by', 'reviewed_at', 'reject_reason',
    ];

    protected $casts = [
        'system_info'      => 'array',
        'app_version_code' => 'integer',
        'reviewed_at'      => 'datetime',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (ActivationRequest $request): void {
            $request->uuid = $request->uuid ?: (string) Str::uuid();
        });
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
