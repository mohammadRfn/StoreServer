<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Modules\Audit\Models\SecurityEvent;

// هشدارهای داخل پنل: رویدادهای امنیتی بررسی‌نشده که نیاز به توجه ادمین دارند
class AlertFeed
{
    /** انواعی که همیشه هشدار حساب می‌شوند (علاوه بر هر رویداد با severity=critical) */
    public const TYPES = [
        'chain_broken',
        'chain_gap',
        'client_logs_silent',
        'client_logs_stuck',
        'fingerprint_mismatch',
    ];

    private const WINDOW_DAYS = 30;

    /** @return Builder<SecurityEvent> */
    public function query(): Builder
    {
        return SecurityEvent::query()
            ->whereNull('acknowledged_at')
            ->where('created_at', '>=', Carbon::now('UTC')->subDays(self::WINDOW_DAYS))
            ->where(fn (Builder $q) => $q->where('severity', 'critical')->orWhereIn('type', self::TYPES));
    }

    /** @return array{count: int, critical: int, items: list<array<string, mixed>>} */
    public function summary(int $limit = 6): array
    {
        $totals = $this->query()
            ->selectRaw("COUNT(*) as total, COALESCE(SUM(severity = 'critical'), 0) as critical")
            ->first();

        $items = $this->query()
            ->with(['license:id,uuid', 'device:id,hostname'])
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (SecurityEvent $e): array => [
                'id'           => $e->id,
                'type'         => $e->type,
                'severity'     => $e->severity,
                'message'      => $e->message,
                'created_at'   => $e->created_at?->toIso8601String(),
                'license_uuid' => $e->license?->uuid,
                'hostname'     => $e->device?->hostname,
            ])
            ->all();

        return [
            'count'    => (int) ($totals->total ?? 0),
            'critical' => (int) ($totals->critical ?? 0),
            'items'    => $items,
        ];
    }

    public function acknowledge(int $eventId, int $adminId): int
    {
        return SecurityEvent::query()
            ->whereKey($eventId)
            ->whereNull('acknowledged_at')
            ->update(['acknowledged_at' => Carbon::now('UTC'), 'acknowledged_by' => $adminId]);
    }

    public function acknowledgeAll(int $adminId): int
    {
        return $this->query()->update(['acknowledged_at' => Carbon::now('UTC'), 'acknowledged_by' => $adminId]);
    }

    /**
     * بستن خودکار هشدارهای یک دستگاه وقتی علتشان رفع شده (acknowledged_by خالی می‌ماند = سیستم).
     *
     * @param  list<string>  $types
     */
    public function resolve(int $deviceId, array $types): void
    {
        SecurityEvent::query()
            ->where('device_id', $deviceId)
            ->whereIn('type', $types)
            ->whereNull('acknowledged_at')
            ->update(['acknowledged_at' => Carbon::now('UTC')]);
    }
}