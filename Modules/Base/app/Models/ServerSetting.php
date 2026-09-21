<?php

declare(strict_types=1);

namespace Modules\Base\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $key
 * @property string|null $value
 * @property string $type
 */
class ServerSetting extends Model
{
    protected $table = 'server_settings';

    protected $fillable = [
        'key', 'value', 'type', 'group', 'description', 'is_public',
    ];

    protected $casts = [
        'is_public'  => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // مقدار را بر اساس ستون type به نوع درست تبدیل می‌کند
    public function typedValue(): mixed
    {
        return match ($this->type) {
            'int'  => (int) $this->value,
            'bool' => filter_var($this->value, FILTER_VALIDATE_BOOL),
            'json' => json_decode((string) $this->value, true),
            default => $this->value,
        };
    }
}
