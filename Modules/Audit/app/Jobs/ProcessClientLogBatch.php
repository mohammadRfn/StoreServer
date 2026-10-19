<?php

declare(strict_types=1);

namespace Modules\Audit\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Modules\Audit\Models\ClientLogInboxItem;
use Modules\Audit\Services\ClientLogInbox;

/**
 * پردازش یک دسته‌ی inbox. فقط شناسه‌ی ردیف را دارد؛ payload در DB می‌ماند،
 * پس از دست رفتن صف یا مرگ worker چیزی گم نمی‌شود (دستور process-inbox ادامه می‌دهد).
 * retry/backoff/dead را وضعیت ردیف inbox مدیریت می‌کند، نه tries صف (tries=1).
 */
class ProcessClientLogBatch implements ShouldBeUniqueUntilProcessing, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 120;

    public bool $failOnTimeout = true;

    public function __construct(public readonly int $inboxId)
    {
        $this->onQueue((string) config('client_logs.queue', 'client-logs'));

        $connection = config('client_logs.queue_connection');

        if (is_string($connection) && $connection !== '') {
            $this->onConnection($connection);
        }
    }

    // یکتا به ازای هر دسته: دو dispatch هم‌زمان یک job می‌شوند
    public function uniqueId(): string
    {
        return 'client-log-inbox:' . $this->inboxId;
    }

    public function uniqueFor(): int
    {
        return 300;
    }

    public function handle(ClientLogInbox $inbox): void
    {
        Cache::put(ClientLogInbox::WORKER_SEEN_KEY, Carbon::now('UTC')->toIso8601String(), 86400);

        $result = $inbox->process($this->inboxId);

        if (! (bool) config('client_logs.dispatch_job', false)) {
            return;
        }

        // دستگاه مشغول بود یا تلاش ناموفق شد → یک dispatch تأخیری برای تلاش بعدی
        // (دستور process-inbox هم هر دقیقه همین ردیف را برمی‌دارد؛ claim اتمیک تکرار را می‌گیرد)
        if ($result === 'busy') {
            self::dispatch($this->inboxId)->delay(now()->addSeconds(15));
        } elseif ($result === 'failed') {
            $next = ClientLogInboxItem::query()->whereKey($this->inboxId)->value('next_attempt_at');

            self::dispatch($this->inboxId)->delay($next !== null ? Carbon::parse((string) $next, 'UTC') : now()->addMinute());
        }
    }
}