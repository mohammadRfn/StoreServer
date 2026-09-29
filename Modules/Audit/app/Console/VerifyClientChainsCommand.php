<?php

declare(strict_types=1);

namespace Modules\Audit\Console;

use Illuminate\Console\Command;
use Modules\Audit\Models\ClientAuditLog;
use Modules\Audit\Services\ClientChainVerifier;

class VerifyClientChainsCommand extends Command
{
    protected $signature = 'client-logs:verify {--device= : فقط یک دستگاه (شناسه)} {--reset : پاک کردن وضعیت زنجیره‌ی دستگاه و شروع دوباره (فقط با --device)}';

    protected $description = 'بررسی پیوستگی زنجیره‌ی هش لاگ‌های دریافتی از اپ‌ها';

    public function handle(ClientChainVerifier $verifier): int
    {
        $only = $this->option('device') !== null ? (int) $this->option('device') : null;

        if ($this->option('reset')) {
            if ($only === null) {
                $this->error('برای --reset شناسه‌ی دستگاه را با --device بدهید.');

                return self::FAILURE;
            }

            $verifier->reset($only);
            $this->info("وضعیت زنجیره‌ی دستگاه {$only} پاک شد و از نو بررسی می‌شود.");
        }

        $ids = $only !== null
            ? [$only]
            : ClientAuditLog::query()->whereNotNull('device_id')->distinct()->pluck('device_id')->all();

        $rows = [];

        foreach ($ids as $id) {
            $s = $verifier->verifyDevice((int) $id);
            $rows[] = [$id, $s->status, $s->reason ?? '—', $s->anchor_sequence, $s->broken_sequence ?? $s->missing_from ?? '—'];
        }

        $this->table(['دستگاه', 'وضعیت', 'علت', 'آخرین sequence پیوسته', 'نقطه‌ی مشکل'], $rows);

        return self::SUCCESS;
    }
}