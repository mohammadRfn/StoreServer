<?php

declare(strict_types=1);

namespace Modules\License\Console;

use Illuminate\Console\Command;
use Modules\License\Services\LicenseCodeService;

class ExpireLicenseCodesCommand extends Command
{
    protected $signature = 'license:expire-codes';

    protected $description = 'منقضی کردن کدهای یک‌بارمصرف گذشته از تاریخ';

    public function handle(LicenseCodeService $codes): int
    {
        $count = $codes->expireDue();
        $this->info("تعداد {$count} کد منقضی شد.");

        return self::SUCCESS;
    }
}
