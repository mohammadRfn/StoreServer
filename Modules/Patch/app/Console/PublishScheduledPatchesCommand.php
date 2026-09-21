<?php

declare(strict_types=1);

namespace Modules\Patch\Console;

use Illuminate\Console\Command;
use Modules\Patch\Services\PatchPublishService;

class PublishScheduledPatchesCommand extends Command
{
    protected $signature = 'patch:publish-scheduled';

    protected $description = 'انتشار پچ‌هایی که زمان انتشارشان فرا رسیده است';

    public function handle(PatchPublishService $publisher): int
    {
        $count = $publisher->publishDue();
        $this->info("تعداد {$count} پچ منتشر شد.");

        return self::SUCCESS;
    }
}
