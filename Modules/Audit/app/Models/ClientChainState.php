<?php

declare(strict_types=1);

namespace Modules\Audit\Models;

use Illuminate\Database\Eloquent\Model;

class ClientChainState extends Model
{
    protected $table = 'client_chain_states';

    protected $primaryKey = 'device_id';

    public $incrementing = false;

    protected $guarded = [];

    protected $casts = [
        'gap_since'   => 'datetime',
        'alerted_at'  => 'datetime',
        'verified_at' => 'datetime',
    ];
}