<?php

declare(strict_types=1);

namespace Modules\License\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Plan\Models\GameshopModule;

class LicenseModuleOverride extends Model
{
    protected $table = 'license_module_overrides';

    protected $fillable = ['license_id', 'module_id', 'enabled', 'reason', 'created_by'];

    protected $casts = [
        'license_id' => 'integer',
        'module_id'  => 'integer',
        'enabled'    => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class, 'license_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(GameshopModule::class, 'module_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
