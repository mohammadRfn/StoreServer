<?php

declare(strict_types=1);

namespace Modules\Audit\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Base\Services\ServerSettings;

// پاکسازی لاگ‌ها بر اساس retention تنظیمات سرور
class PruneLogsCommand extends Command
{
    protected $signature = 'logs:prune {--dry-run : فقط گزارش بدون حذف}';

    protected $description = 'حذف لاگ‌های قدیمی بر اساس retention هر دسته';

    /** @var array<string, string> نگاشت جدول به کلید تنظیم */
    private array $map = [
        'audit_logs'         => 'log_retention_audit_days',
        'license_event_logs' => 'log_retention_license_days',
        'heartbeat_logs'     => 'log_retention_heartbeat_days',
        'device_logs'        => 'log_retention_device_days',
        'patch_downloads'    => 'log_retention_patch_days',
        'security_events'    => 'log_retention_security_days',
        'error_logs'         => 'log_retention_error_days',
        'api_request_logs'   => 'log_retention_api_days',
    ];

    public function handle(ServerSettings $settings): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $rows = [];

        foreach ($this->map as $table => $settingKey) {
            $days = $settings->int($settingKey, 365);
            $threshold = Carbon::now('UTC')->subDays($days);

            $query = DB::table($table)->where('created_at', '<', $threshold);
            $count = $query->count();

            if (! $dryRun && $count > 0) {
                // جدول audit_logs تریگر فقط‌افزودنی دارد؛ پاکسازی با متغیر مجاز انجام می‌شود
                if ($table === 'audit_logs') {
                    DB::statement('SET @storeserver_retention_purge = 1');
                }

                $query->delete();

                if ($table === 'audit_logs') {
                    DB::statement('SET @storeserver_retention_purge = NULL');
                }
            }

            $rows[] = [$table, $days, $count];
        }

        $this->table(['جدول', 'نگهداشت (روز)', 'تعداد رکورد' . ($dryRun ? ' (بدون حذف)' : ' حذف‌شده')], $rows);

        return self::SUCCESS;
    }
}
