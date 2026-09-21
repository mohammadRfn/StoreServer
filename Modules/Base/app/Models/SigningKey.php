<?php

declare(strict_types=1);

namespace Modules\Base\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $kid
 * @property string $public_key
 * @property string $status
 */
class SigningKey extends Model
{
    protected $table = 'signing_keys';

    protected $fillable = [
        'kid', 'algorithm', 'public_key', 'fingerprint', 'status',
        'activated_at', 'retired_at', 'note',
    ];

    protected $casts = [
        'activated_at' => 'datetime',
        'retired_at'   => 'datetime',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
