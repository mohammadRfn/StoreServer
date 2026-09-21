<?php

declare(strict_types=1);

namespace Modules\Patch\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatchFile extends Model
{
    public $timestamps = false;

    protected $table = 'patch_files';

    protected $fillable = ['patch_id', 'path', 'action', 'sha256', 'size'];

    protected $casts = [
        'patch_id' => 'integer',
        'size'     => 'integer',
    ];

    public function patch(): BelongsTo
    {
        return $this->belongsTo(Patch::class, 'patch_id');
    }
}
