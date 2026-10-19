<?php

declare(strict_types=1);

namespace Modules\Audit\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Modules\Audit\Models\ClientLogInboxItem;
use Modules\Audit\Services\ClientLogInbox;
use Modules\Audit\Services\ClientLogInboxHealth;

// Fallback بدون worker: همان inbox را پردازش می‌کند (هر دقیقه در scheduler ثبت است)
class ProcessInboxCommand extends Command
{
    protected $signature = 'client-logs:process-inbox
        {--limit=300 : حداکثر تعداد دسته در هر اجرا}
        {--max-seconds=45 : حداکثر زمان اجرا (ثانیه)}
        {--id= : فقط یک ردیف inbox (برای تست دستی)}';

    protected $description = 'پردازش دسته‌های لاگ منتظر در inbox (جایگزین worker صف)';

    public function handle(ClientLogInbox $inbox, ClientLogInboxHealth $health): int
    {
        Cache::put(ClientLogInbox::DRAIN_SEEN_KEY, Carbon::now('UTC')->toIso8601String(), 86400);

        $only = $this->option('id');

        if ($only !== null) {
            if (! ctype_digit((string) $only) || (int) $only < 1) {
                $this->error('مقدار --id باید شناسه‌ی عددی ردیف inbox باشد.');

                return self::FAILURE;
            }

            $row = ClientLogInboxItem::query()->find((int) $only, ['id', 'status']);

            if ($row === null) {
                $this->error("ردیف {$only} در inbox پیدا نشد.");

                return self::FAILURE;
            }

            $this->info("ردیف {$only}: " . $inbox->process((int) $only));
            $health->check();

            return self::SUCCESS;
        }

        $stats = $inbox->drain(
            max(1, (int) $this->option('limit')),
            max(1, (int) $this->option('max-seconds')),
        );

        // هشدار انباشتگی در هر اجرا (حتی اگر چیزی پردازش نشده)
        $health->check();

        $this->table(
            ['پردازش‌شده', 'موفق', 'ناموفق (retry)', 'dead', 'مشغول', 'بازیابی‌شده'],
            [[$stats['processed'], $stats['done'], $stats['failed'], $stats['dead'], $stats['busy'], $stats['recovered']]],
        );

        return self::SUCCESS;
    }
}