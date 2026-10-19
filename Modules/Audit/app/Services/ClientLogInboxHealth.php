<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Audit\Models\ClientLogInboxItem;
use Modules\Audit\Models\SecurityEvent;
use Modules\License\Models\Device;
use Modules\License\Models\License;

/**
 * آمار و هشدار inbox لاگ اپ‌ها:
 *  - client_logs_inbox_backlog: دسته‌ها انباشته شده‌اند (worker/دستور کار نمی‌کند)
 *  - client_logs_inbox_dead: یک دسته بعد از همه‌ی تلاش‌ها dead شد
 */
class ClientLogInboxHealth
{
    public const BACKLOG = 'client_logs_inbox_backlog';
    public const DEAD = 'client_logs_inbox_dead';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly AlertFeed $alerts,
    ) {}

    /**
     * @return array{
     *   mode:string, pending:int, processing:int, failed:int, dead:int, done:int,
     *   waiting:int, oldest_waiting_at:?string, oldest_waiting_seconds:?int, last_processed_at:?string,
     *   worker_seen_at:?string, drain_seen_at:?string, dispatch_job:bool, stalled:bool
     * }
     */
    public function stats(string $mode): array
    {
        $counts = ClientLogInboxItem::query()
            ->select('status', DB::raw('COUNT(*) as c'))
            ->groupBy('status')
            ->pluck('c', 'status')
            ->all();

        $get = static fn (string $s): int => (int) ($counts[$s] ?? 0);

        $oldest = ClientLogInboxItem::query()
            ->whereIn('status', [ClientLogInboxItem::STATUS_PENDING, ClientLogInboxItem::STATUS_FAILED])
            ->min('created_at');

        $oldestAt = $oldest !== null ? Carbon::parse((string) $oldest, 'UTC') : null;
        $oldestSeconds = $oldestAt !== null ? max(0, (int) $oldestAt->diffInSeconds(Carbon::now('UTC'), true)) : null;

        $lastProcessed = ClientLogInboxItem::query()->where('status', ClientLogInboxItem::STATUS_DONE)->max('processed_at');

        $workerSeen = Cache::get(ClientLogInbox::WORKER_SEEN_KEY);
        $drainSeen = Cache::get(ClientLogInbox::DRAIN_SEEN_KEY);

        $waiting = $get(ClientLogInboxItem::STATUS_PENDING) + $get(ClientLogInboxItem::STATUS_FAILED);

        return [
            'mode'                   => $mode,
            'pending'                => $get(ClientLogInboxItem::STATUS_PENDING),
            'processing'             => $get(ClientLogInboxItem::STATUS_PROCESSING),
            'failed'                 => $get(ClientLogInboxItem::STATUS_FAILED),
            'dead'                   => $get(ClientLogInboxItem::STATUS_DEAD),
            'done'                   => $get(ClientLogInboxItem::STATUS_DONE),
            'waiting'                => $waiting,
            'oldest_waiting_at'      => $oldestAt?->toIso8601String(),
            'oldest_waiting_seconds' => $oldestSeconds,
            'last_processed_at'      => $lastProcessed !== null ? Carbon::parse((string) $lastProcessed, 'UTC')->toIso8601String() : null,
            'worker_seen_at'         => is_string($workerSeen) ? $workerSeen : null,
            'drain_seen_at'          => is_string($drainSeen) ? $drainSeen : null,
            'dispatch_job'           => (bool) config('client_logs.dispatch_job', false),
            'stalled'                => $this->isBacklogged($waiting, $oldestSeconds),
        ];
    }

    /** انباشتگی را بررسی می‌کند: هشدار می‌سازد یا اگر رفع شده، خودکار می‌بندد (در هر اجرای scheduler) */
    public function check(): void
    {
        $waiting = ClientLogInboxItem::query()
            ->whereIn('status', [ClientLogInboxItem::STATUS_PENDING, ClientLogInboxItem::STATUS_FAILED])
            ->count();

        $oldest = $waiting > 0
            ? ClientLogInboxItem::query()->whereIn('status', [ClientLogInboxItem::STATUS_PENDING, ClientLogInboxItem::STATUS_FAILED])->min('created_at')
            : null;

        $oldestSeconds = $oldest !== null ? max(0, (int) Carbon::parse((string) $oldest, 'UTC')->diffInSeconds(Carbon::now('UTC'), true)) : null;

        if (! $this->isBacklogged($waiting, $oldestSeconds)) {
            SecurityEvent::query()
                ->where('type', self::BACKLOG)
                ->whereNull('acknowledged_at')
                ->update(['acknowledged_at' => Carbon::now('UTC')]);

            return;
        }

        $open = SecurityEvent::query()->where('type', self::BACKLOG)->whereNull('acknowledged_at')->exists();

        if ($open) {
            return;
        }

        $this->audit->security(self::BACKLOG, 'صف ورودی لاگ اپ‌ها انباشته شده است (worker یا process-inbox کار نمی‌کند؟)', [
            'waiting'        => $waiting,
            'oldest_seconds' => $oldestSeconds,
        ], 'warning');
    }

    /** هشدار dead شدن یک دسته؛ برای هر دستگاه در هر ۲۴ ساعت فقط یک رویداد */
    public function raiseDead(ClientLogInboxItem $row): void
    {
        try {
            $recent = SecurityEvent::query()
                ->where('type', self::DEAD)
                ->where('device_id', $row->device_id)
                ->where('license_id', $row->license_id)
                ->whereNull('acknowledged_at')
                ->where('created_at', '>=', Carbon::now('UTC')->subDay())
                ->exists();

            if ($recent) {
                return;
            }

            $this->audit->security(self::DEAD, 'یک دسته‌ی لاگ بعد از همه‌ی تلاش‌ها پردازش نشد (dead)', [
                'inbox_id' => $row->getKey(),
                'attempts' => $row->attempts,
            ], 'warning', License::query()->find($row->license_id), $row->device_id !== null ? Device::query()->find($row->device_id) : null);
        } catch (\Throwable $e) {
            report($e); // خطای هشدار نباید پردازش را خراب کند
        }
    }

    /** بعد از retry دستی: اگر برای آن دستگاه dead دیگری نمانده، هشدارش بسته شود */
    public function resolveDeadAlert(?int $deviceId): void
    {
        if ($deviceId === null) {
            return;
        }

        $stillDead = ClientLogInboxItem::query()
            ->where('device_id', $deviceId)
            ->where('status', ClientLogInboxItem::STATUS_DEAD)
            ->exists();

        if (! $stillDead) {
            $this->alerts->resolve($deviceId, [self::DEAD]);
        }
    }

    private function isBacklogged(int $waiting, ?int $oldestSeconds): bool
    {
        if ($waiting <= 0) {
            return false;
        }

        $minutes = max(1, (int) config('client_logs.backlog_alert_minutes', 15));
        $count = max(1, (int) config('client_logs.backlog_alert_count', 200));

        return $waiting >= $count || ($oldestSeconds !== null && $oldestSeconds >= $minutes * 60);
    }
}