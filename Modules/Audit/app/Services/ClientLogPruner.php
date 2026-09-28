<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Base\Services\ServerSettings;

// پاکسازی لاگ‌های دریافتی از کلاینت‌ها (client_audit_logs / client_audit_batches)
class ClientLogPruner
{
    /** حذف دسته‌ای، تا جدول بزرگ برای مدت طولانی قفل نشود */
    private const CHUNK = 5000;

    /** این سطوح زودتر پاک می‌شوند؛ error و بالاتر و کانال security دیرتر */
    private const LOW_LEVELS = ['debug', 'info', 'notice', 'warning'];

    public function __construct(private readonly ServerSettings $settings) {}

    /** @return list<array{0: string, 1: int, 2: int}> ردیف‌های جدول خروجی دستور logs:prune */
    public function prune(bool $dryRun): array
    {
        $normalDays = max(1, $this->settings->int('log_retention_client_days', 180));
        $longDays = max($normalDays, $this->settings->int('log_retention_client_error_days', 365));
        $batchDays = max(1, $this->settings->int('log_retention_client_batch_days', 90));

        $now = Carbon::now('UTC');
        $normalCutoff = $now->copy()->subDays($normalDays);
        $longCutoff = $now->copy()->subDays($longDays);
        $batchCutoff = $now->copy()->subDays($batchDays);

        $lowLevel = static fn (): Builder => DB::table('client_audit_logs')
            ->where('created_at', '<', $normalCutoff)
            ->whereIn('level', self::LOW_LEVELS)
            ->where('channel', '<>', 'security');

        $highLevel = static fn (): Builder => DB::table('client_audit_logs')
            ->where('created_at', '<', $longCutoff)
            ->where(function (Builder $q): void {
                $q->whereNotIn('level', self::LOW_LEVELS)->orWhere('channel', 'security');
            });

        // batch فقط وقتی پاک می‌شود که هیچ لاگی به آن وصل نمانده باشد
        $batches = static fn (): Builder => DB::table('client_audit_batches')
            ->where('created_at', '<', $batchCutoff)
            ->whereNotExists(function (Builder $q): void {
                $q->selectRaw('1')
                    ->from('client_audit_logs')
                    ->whereColumn('client_audit_logs.batch_id', 'client_audit_batches.id');
            });

        $this->allowPurge(! $dryRun);

        try {
            return [
                ['client_audit_logs (info/warning)', $normalDays, $this->run($lowLevel, $dryRun)],
                ['client_audit_logs (error/security)', $longDays, $this->run($highLevel, $dryRun)],
                ['client_audit_batches', $batchDays, $this->run($batches, $dryRun)],
            ];
        } finally {
            $this->allowPurge(false);
        }
    }

    private function run(Closure $query, bool $dryRun): int
    {
        if ($dryRun) {
            return (int) $query()->count();
        }

        $total = 0;

        do {
            $deleted = (int) $query()->limit(self::CHUNK)->delete();
            $total += $deleted;
        } while ($deleted === self::CHUNK);

        return $total;
    }

    // مثل audit_logs: اگر جدول تریگر فقط‌افزودنی داشته باشد، این متغیر اجازه‌ی پاکسازی می‌دهد (بدون تریگر بی‌اثر است)
    private function allowPurge(bool $on): void
    {
        DB::statement($on ? 'SET @storeserver_retention_purge = 1' : 'SET @storeserver_retention_purge = NULL');
    }
}