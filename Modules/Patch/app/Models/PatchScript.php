<?php

declare(strict_types=1);

namespace Modules\Patch\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatchScript extends Model
{
    public $timestamps = false;

    protected $table = 'patch_scripts';

    protected $fillable = ['patch_id', 'order_no', 'file_name', 'checksum'];

    protected $casts = [
        'patch_id' => 'integer',
        'order_no' => 'integer',
    ];

    public function patch(): BelongsTo
    {
        return $this->belongsTo(Patch::class, 'patch_id');
    }
}
