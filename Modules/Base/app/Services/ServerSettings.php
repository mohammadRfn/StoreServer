<?php

declare(strict_types=1);

namespace Modules\Base\Services;

use Illuminate\Support\Facades\Cache;
use Modules\Base\Models\ServerSetting;

// سرویس خواندن و نوشتن تنظیمات سرور با کش
class ServerSettings
{
    private const CACHE_KEY = 'storeserver:settings';

    private const CACHE_TTL = 300;

    /** @return array<string, mixed> */
    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function (): array {
            return ServerSetting::query()
                ->get()
                ->mapWithKeys(fn (ServerSetting $s) => [$s->key => $s->typedValue()])
                ->all();
        });
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    public function int(string $key, int $default = 0): int
    {
        $value = $this->get($key, $default);

        return is_numeric($value) ? (int) $value : $default;
    }

    public function bool(string $key, bool $default = false): bool
    {
        $value = $this->get($key, $default);

        return filter_var($value, FILTER_VALIDATE_BOOL);
    }

    public function set(string $key, mixed $value, string $type = 'string', string $group = 'general'): ServerSetting
    {
        $stored = $type === 'json'
            ? json_encode($value, JSON_UNESCAPED_UNICODE)
            : (is_bool($value) ? ($value ? '1' : '0') : (string) $value);

        $setting = ServerSetting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $stored, 'type' => $type, 'group' => $group],
        );

        $this->flush();

        return $setting;
    }

    /** @param array<string, mixed> $values */
    public function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            $existing = ServerSetting::query()->where('key', $key)->first();
            $this->set($key, $value, $existing?->type ?? 'string', $existing?->group ?? 'general');
        }
    }

    /** @return array<string, mixed> */
    public function publicSettings(): array
    {
        return ServerSetting::query()
            ->where('is_public', true)
            ->get()
            ->mapWithKeys(fn (ServerSetting $s) => [$s->key => $s->typedValue()])
            ->all();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    // میان‌برهای پرکاربرد
    public function offlineGraceDays(): int
    {
        return max(1, $this->int('offline_grace_days', (int) config('licensing.token.default_offline_grace_days', 7)));
    }

    public function heartbeatIntervalMinutes(): int
    {
        return max(5, $this->int('heartbeat_interval_minutes', (int) config('licensing.token.default_heartbeat_minutes', 60)));
    }

    public function replayWindowSeconds(): int
    {
        return max(30, $this->int('replay_window_seconds', (int) config('licensing.security.replay_window_seconds', 300)));
    }

    public function patchLinkTtlMinutes(): int
    {
        return max(1, $this->int('patch_link_ttl_minutes', (int) config('licensing.patch.signed_link_ttl', 15)));
    }

    public function patchMaxFailures(): int
    {
        return max(1, $this->int('patch_max_failures', (int) config('licensing.patch.max_failures_per_device', 3)));
    }
}
