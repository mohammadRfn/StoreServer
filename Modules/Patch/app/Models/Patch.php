<?php

declare(strict_types=1);

namespace Modules\Patch\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Modules\License\Models\License;
use Modules\Plan\Models\Plan;

/**
 * @property string $patch_code
 * @property string $status
 * @property int $from_min_code
 * @property int $from_max_code
 * @property int $to_version_code
 */
class Patch extends Model
{
    protected $table = 'patches';

    protected $fillable = [
        'uuid', 'patch_code', 'title', 'description', 'type',
        'from_min', 'from_min_code', 'from_max', 'from_max_code',
        'to_version', 'to_version_code', 'requires_restart', 'is_mandatory',
        'status', 'target_type', 'scheduled_at', 'published_at', 'withdrawn_at',
        'file_disk', 'file_path', 'file_name', 'file_size', 'file_sha256',
        'manifest', 'signature', 'signing_kid', 'uploaded_by',
    ];

    protected $casts = [
        'manifest'         => 'array',
        'requires_restart' => 'boolean',
        'is_mandatory'     => 'boolean',
        'from_min_code'    => 'integer',
        'from_max_code'    => 'integer',
        'to_version_code'  => 'integer',
        'file_size'        => 'integer',
        'scheduled_at'     => 'datetime',
        'published_at'     => 'datetime',
        'withdrawn_at'     => 'datetime',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Patch $patch): void {
            $patch->uuid = $patch->uuid ?: (string) Str::uuid();
        });
    }

    public function files(): HasMany
    {
        return $this->hasMany(PatchFile::class, 'patch_id');
    }

    public function scripts(): HasMany
    {
        return $this->hasMany(PatchScript::class, 'patch_id')->orderBy('order_no');
    }

    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'patch_dependencies', 'patch_id', 'depends_on_patch_id');
    }

    public function targetPlans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'patch_target_plans', 'patch_id', 'plan_id');
    }

    public function targetLicenses(): BelongsToMany
    {
        return $this->belongsToMany(License::class, 'patch_target_licenses', 'patch_id', 'license_id');
    }

    public function deviceStatuses(): HasMany
    {
        return $this->hasMany(DevicePatchStatus::class, 'patch_id');
    }

    public function downloads(): HasMany
    {
        return $this->hasMany(PatchDownload::class, 'patch_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function getRouteKeyName(): string
    {
        return 'patch_code';
    }
}
