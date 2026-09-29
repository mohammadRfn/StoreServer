<?php

declare(strict_types=1);

namespace Modules\Audit\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Audit\Models\SecurityEvent;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Services\ServerSettings;
use Modules\License\Models\Device;

class CheckSilentDevicesCommand extends Command
{
    protected $signature = 'client-logs:check-silent';

    protected $description = 'ثبت رویداد امنیتی برای دستگاه‌های فعالی که مدتی لاگ نفرستاده‌اند';

    public function handle(AuditLogger $audit, ServerSettings $settings): int
    {
        $hours = max(1, $settings->int('client_silent_after_hours', 72));
        $cutoff = Carbon::now('UTC')->subHours($hours);

        // آخرین لاگ دریافتی هر دستگاهی که قبلاً حداقل یک بار لاگ فرستاده
        $lastLog = DB::table('client_audit_logs')
            ->whereNotNull('device_id')
            ->groupBy('device_id')
            ->selectRaw('device_id, MAX(created_at) as last_at');

        $silent = Device::query()
            ->joinSub($lastLog, 'l', 'l.device_id', '=', 'devices.id')
            ->where('l.last_at', '<', $cutoff)
            ->where('devices.last_heartbeat_at', '>=', $cutoff) // دستگاه زنده است ولی لاگ نمی‌فرستد
            ->get(['devices.*', 'l.last_at']);

        $count = 0;

        foreach ($silent as $device) {
            // برای هر دستگاه در هر بازه‌ی آستانه فقط یک بار
            $already = SecurityEvent::query()
                ->where('type', 'client_logs_silent')
                ->where('device_id', $device->id)
                ->where('created_at', '>=', $cutoff)
                ->exists();

            if ($already) {
                continue;
            }

            $audit->security('client_logs_silent', 'دستگاه فعال است ولی مدتی لاگ نفرستاده', [
                'last_log_at' => (string) $device->last_at,
                'threshold_hours' => $hours,
            ], 'warning', $device->license, $device);
            $count++;
        }

        $this->info("{$count} رویداد «دستگاه ساکت» ثبت شد.");

        return self::SUCCESS;
    }
}