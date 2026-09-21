<?php

declare(strict_types=1);

namespace Modules\License\Console;

use Illuminate\Console\Command;
use Modules\License\Services\LicenseService;

// منقضی کردن لایسنس‌هایی که تاریخشان گذشته است
class ExpireDueLicensesCommand extends Command
{
    protected $signature = 'license:expire-due';

    protected $description = 'تغییر وضعیت لایسنس‌های گذشته از تاریخ انقضا به expired';

    public function handle(LicenseService $licenses): int
    {
        $count = $licenses->expireDue();
        $this->info("تعداد {$count} لایسنس منقضی شد.");

        return self::SUCCESS;
    }
}
