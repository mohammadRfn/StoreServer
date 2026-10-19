<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Audit\Jobs\ProcessClientLogBatch;
use Modules\Audit\Models\ClientAuditBatch;
use Modules\Audit\Models\ClientLogInboxItem;
use Modules\Base\Services\ServerSettings;
use Modules\License\Models\Device;
use Modules\License\Models\License;
use RuntimeException;
use Throwable;

/**
 * Inbox پایدار لاگ اپ‌ها:
 *  - receive(): ذخیره‌ی سریع دسته (بدون درج لاگ‌ها) → اندپوینت فوراً جواب می‌دهد.
 *  - process(): پردازش یک دسته با همان ClientLogIngestor، verify زنجیره و resolve هشدار،
 *    زیر قفل هر دستگاه تا دو پردازش هم‌زمان برای یک دستگاه race نسازند.
 *  - drain(): پردازش دسته‌ای (برای دستور artisan / scheduler وقتی worker نیست).
 */
class ClientLogInbox
{
    public const WORKER_SEEN_KEY = 'client-logs:inbox:worker_seen';
    public const DRAIN_SEEN_KEY = 'client-logs:inbox:drain_seen';

    public function __construct(
        private readonly ClientLogIngestor $ingestor,
        private readonly ClientChainVerifier $chains,
        private readonly AlertFeed $alerts,
        private readonly ClientLogInboxHealth $health,
        private readonly ServerSettings $settings,
    ) {}

    /** حالت فعلی دریافت: sync | queue (تنظیم سرور بر env اولویت دارد) */
    public function mode(): string
    {
        $fromSettings = $this->settings->get('client_logs_ingest_mode');
        $mode = is_string($fromSettings) && $fromSettings !== '' ? $fromSettings : (string) config('client_logs.ingest_mode', 'sync');

        return $mode === 'queue' ? 'queue' : 'sync';
    }

    public function isQueueMode(): bool
    {
        return $this->mode() === 'queue';
    }

    /** این batch قبلاً با حالت sync پردازش شده؟ (برای retry اپ بعد از سوییچ حالت) */
    public function alreadyIngested(string $batchUuid): bool
    {
        return $batchUuid !== '' && ClientAuditBatch::query()->where('uuid', $batchUuid)->exists();
    }

    /**
     * ذخیره‌ی دسته در inbox. خطای ذخیره عمداً پرتاب می‌شود تا کنترلر 5xx بدهد
     * (تأیید کاذب ممنوع: اپ فقط وقتی synced می‌کند که دسته واقعاً روی دیسک سرور نشسته).
     *
     * @param  array<string, mixed>  $payload  بدنه‌ی اعتبارسنجی‌شده
     * @param  array{ip?: string|null, payload_bytes?: int}  $meta
     * @return array{batch_id:string, accepted:list<string>, rejected:list<array{uuid:string, reason:string}>, status:string, duplicate:bool, conflict:bool}
     *
     * @throws PayloadTooLargeException
     */
    public function receive(License $license, ?Device $device, array $payload, array $meta = []): array
    {
        $batchUuid = (string) ($payload['batch']['uuid'] ?? '');

        // لاگ‌های بدشکل (بدون uuid) همان لحظه رد می‌شوند و ذخیره نمی‌شوند
        $valid = [];
        $rejected = [];
        $seen = [];

        foreach ((array) ($payload['logs'] ?? []) as $log) {
            $uuid = is_array($log) ? (string) ($log['uuid'] ?? '') : '';

            if ($uuid === '') {
                $rejected[] = ['uuid' => '', 'reason' => 'MISSING_UUID'];

                continue;
            }

            if (isset($seen[$uuid])) {
                continue; // تکراری داخل همین دسته؛ یکی کافی است
            }

            $seen[$uuid] = true;
            $valid[] = $log;
        }

        $accepted = array_keys($seen);
        $accepted = array_map('strval', $accepted);

        // retry همان batch → ردیف جدید نمی‌سازیم و وضعیت فعلی را برمی‌گردانیم
        $existing = ClientLogInboxItem::query()->where('batch_uuid', $batchUuid)->first(['id', 'license_id', 'status']);

        if ($existing !== null) {
            return $this->duplicateResult($existing, $license, $batchUuid, $accepted, $rejected);
        }

        $payload['logs'] = $valid;
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);

        if ($json === false || strlen($json) > (int) config('client_logs.max_raw_bytes')) {
            throw new PayloadTooLargeException('حجم دسته از سقف مجاز inbox بیشتر است.');
        }

        $compressed = gzencode($json, 5);

        if ($compressed === false) {
            throw new RuntimeException('فشرده‌سازی payload ناموفق بود.');
        }

        $stored = base64_encode($compressed);

        if (strlen($stored) > (int) config('client_logs.max_stored_bytes')) {
            throw new PayloadTooLargeException('حجم فشرده‌ی دسته از سقف مجاز inbox بیشتر است.');
        }

        try {
            $item = ClientLogInboxItem::query()->create([
                'license_id'    => $license->getKey(),
                'device_id'     => $device?->getKey(),
                'batch_uuid'    => $batchUuid,
                'payload'       => $stored,
                'payload_bytes' => strlen($json),
                'stored_bytes'  => strlen($stored),
                'log_count'     => count($valid),
                'ip'            => $meta['ip'] ?? null,
                'status'        => ClientLogInboxItem::STATUS_PENDING,
                'attempts'      => 0,
            ]);
        } catch (QueryException $e) {
            // رقابت دو retry هم‌زمان: UNIQUE روی batch_uuid (کد 1062) = همان batch
            if (((int) ($e->errorInfo[1] ?? 0)) === 1062) {
                $existing = ClientLogInboxItem::query()->where('batch_uuid', $batchUuid)->first(['id', 'license_id', 'status']);

                if ($existing !== null) {
                    return $this->duplicateResult($existing, $license, $batchUuid, $accepted, $rejected);
                }
            }

            throw $e; // هر خطای دیگر → 5xx (retryable)
        }

        $this->dispatchJob((int) $item->getKey());

        return [
            'batch_id'  => $batchUuid,
            'accepted'  => $accepted,
            'rejected'  => $rejected,
            'status'    => ClientLogInboxItem::STATUS_PENDING,
            'duplicate' => false,
            'conflict'  => false,
        ];
    }

    /**
     * پردازش یک ردیف inbox.
     *
     * @return string done|failed|dead|skipped|busy
     */
    public function process(int $id): string
    {
        $row = ClientLogInboxItem::query()->find($id);

        if ($row === null || ! in_array($row->status, [ClientLogInboxItem::STATUS_PENDING, ClientLogInboxItem::STATUS_FAILED], true)) {
            return 'skipped';
        }

        if ($row->next_attempt_at !== null && $row->next_attempt_at->isFuture()) {
            return 'skipped';
        }

        // قفل به ازای دستگاه: درج + verify زنجیره‌ی یک دستگاه هرگز هم‌زمان با دسته‌ی دیگرش اجرا نشود
        $lockKey = 'client-logs:device:' . ($row->device_id !== null ? 'd' . $row->device_id : 'l' . $row->license_id);
        $lock = Cache::lock($lockKey, (int) config('client_logs.device_lock_seconds', 180));

        if (! $lock->get()) {
            return 'busy';
        }

        try {
            $now = Carbon::now('UTC');

            // claim اتمیک؛ اگر job و دستور هم‌زمان رسیدند فقط یکی برنده می‌شود
            $claimed = ClientLogInboxItem::query()
                ->whereKey($id)
                ->whereIn('status', [ClientLogInboxItem::STATUS_PENDING, ClientLogInboxItem::STATUS_FAILED])
                ->where(fn($q) => $q->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', $now))
                ->update([
                    'status'    => ClientLogInboxItem::STATUS_PROCESSING,
                    'locked_at' => $now,
                    'attempts'  => DB::raw('attempts + 1'),
                ]);

            if ($claimed !== 1) {
                return 'skipped';
            }

            $row->refresh();

            return $this->run($row);
        } finally {
            $lock->release();
        }
    }

    /**
     * پردازش دسته‌ای ردیف‌های آماده (برای client-logs:process-inbox).
     *
     * @return array{processed:int, done:int, failed:int, dead:int, busy:int, recovered:int}
     */
    public function drain(int $limit, int $maxSeconds): array
    {
        $startedAt = microtime(true);
        $stats = ['processed' => 0, 'done' => 0, 'failed' => 0, 'dead' => 0, 'busy' => 0, 'recovered' => $this->recoverStale()];
        $skip = [];

        while ($stats['processed'] < $limit && (microtime(true) - $startedAt) < $maxSeconds) {
            $ids = ClientLogInboxItem::query()
                ->whereIn('status', [ClientLogInboxItem::STATUS_PENDING, ClientLogInboxItem::STATUS_FAILED])
                ->where(fn($q) => $q->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', Carbon::now('UTC')))
                ->when($skip !== [], fn($q) => $q->whereNotIn('id', $skip))
                ->orderBy('id')
                ->limit(20)
                ->pluck('id')
                ->all();

            if ($ids === []) {
                break;
            }

            foreach ($ids as $id) {
                if ($stats['processed'] >= $limit || (microtime(true) - $startedAt) >= $maxSeconds) {
                    break 2;
                }

                $result = $this->process((int) $id);

                if ($result === 'busy') {
                    $stats['busy']++;
                    $skip[] = (int) $id;
                } elseif ($result === 'skipped') {
                    $skip[] = (int) $id;
                } else {
                    $stats['processed']++;
                    $stats[$result]++;
                }
            }
        }

        return $stats;
    }

    /** ردیف‌های processing که worker/دستور وسط کار مرده است را به failed/dead برمی‌گرداند */
    public function recoverStale(): int
    {
        $cutoff = Carbon::now('UTC')->subSeconds((int) config('client_logs.stale_lock_seconds', 600));
        $max = max(1, (int) config('client_logs.max_attempts', 5));
        $count = 0;

        $stale = ClientLogInboxItem::query()
            ->where('status', ClientLogInboxItem::STATUS_PROCESSING)
            ->where('locked_at', '<', $cutoff)
            ->get(['id', 'attempts', 'license_id', 'device_id']);

        foreach ($stale as $row) {
            $dead = (int) $row->attempts >= $max;

            ClientLogInboxItem::query()
                ->whereKey($row->getKey())
                ->where('status', ClientLogInboxItem::STATUS_PROCESSING)
                ->update([
                    'status'          => $dead ? ClientLogInboxItem::STATUS_DEAD : ClientLogInboxItem::STATUS_FAILED,
                    'locked_at'       => null,
                    'next_attempt_at' => $dead ? null : Carbon::now('UTC'),
                    'last_error'      => 'پردازش وسط کار متوقف شد (قفل منقضی)',
                ]);

            if ($dead) {
                $this->health->raiseDead($row);
            }

            $count++;
        }

        return $count;
    }

    /** retry دستی یک ردیف dead/failed؛ false اگر payload پاک شده باشد */
    public function retry(ClientLogInboxItem $item): bool
    {
        if (! in_array($item->status, [ClientLogInboxItem::STATUS_DEAD, ClientLogInboxItem::STATUS_FAILED], true)) {
            return false;
        }

        $affected = ClientLogInboxItem::query()
            ->whereKey($item->getKey())
            ->whereIn('status', [ClientLogInboxItem::STATUS_DEAD, ClientLogInboxItem::STATUS_FAILED])
            ->whereNotNull('payload')
            ->update([
                'status'          => ClientLogInboxItem::STATUS_PENDING,
                'attempts'        => 0,
                'next_attempt_at' => null,
                'locked_at'       => null,
            ]);

        if ($affected === 1) {
            $this->dispatchJob((int) $item->getKey());
            $this->health->resolveDeadAlert($item->device_id !== null ? (int) $item->device_id : null);
        }

        return $affected === 1;
    }

    /** retry همه‌ی dead ها؛ تعداد ردیف‌های برگشت‌خورده را می‌دهد */
    public function retryAllDead(): int
    {
        $total = 0;

        ClientLogInboxItem::query()
            ->where('status', ClientLogInboxItem::STATUS_DEAD)
            ->whereNotNull('payload')
            ->orderBy('id')
            ->select(['id', 'device_id', 'status'])
            ->chunkById(500, function ($rows) use (&$total): void {
                foreach ($rows as $row) {
                    if ($this->retry($row)) {
                        $total++;
                    }
                }
            });

        return $total;
    }

    // ---------------------------------------------------------------- داخلی

    private function run(ClientLogInboxItem $row): string
    {
        try {
            $payload = $this->decodePayload($row);

            /** @var License|null $license */
            $license = License::query()->find($row->license_id);

            if ($license === null) {
                return $this->fail($row, new RuntimeException('لایسنس این دسته دیگر وجود ندارد.'), permanent: true);
            }

            /** @var Device|null $device */
            $device = $row->device_id !== null ? Device::query()->find($row->device_id) : null;

            // بازاستفاده از همان ingestor: idempotent روی batch.uuid و log.uuid، رفتار duplicate/rejected/STORE_FAILED عیناً حفظ
            $result = $this->ingestor->ingest($license, $device, $payload, [
                'ip'            => $row->ip,
                'payload_bytes' => (int) $row->payload_bytes,
            ]);

            ClientLogInboxItem::query()->whereKey($row->getKey())->update([
                'status'           => ClientLogInboxItem::STATUS_DONE,
                'accepted_count'   => count($result['accepted']),
                'rejected_count'   => count($result['rejected']),
                'rejected_reasons' => $result['rejected'] === [] ? null : json_encode(
                    collect($result['rejected'])->countBy('reason')->all(),
                    JSON_UNESCAPED_UNICODE,
                ),
                'processed_at'     => Carbon::now('UTC'),
                'locked_at'        => null,
                'next_attempt_at'  => null,
                'last_error'       => null,
            ]);
        } catch (Throwable $e) {
            return $this->fail($row, $e);
        }

        // verify زنجیره و بستن هشدار «ساکت»؛ خطا هرگز نباید پردازش دسته را ناموفق کند
        if ($row->device_id !== null) {
            try {
                $this->chains->verifyDevice((int) $row->device_id);
                $this->alerts->resolve((int) $row->device_id, ['client_logs_silent']);
            } catch (Throwable $e) {
                report($e);
            }
        }

        return 'done';
    }

    /** @return array<string, mixed> */
    private function decodePayload(ClientLogInboxItem $row): array
    {
        $stored = (string) ($row->payload ?? '');

        if ($stored === '') {
            throw new RuntimeException('payload این دسته خالی است.');
        }

        $binary = base64_decode($stored, true);
        $json = $binary === false ? false : @gzdecode($binary);
        $data = $json === false ? null : json_decode($json, true);

        if (! is_array($data)) {
            throw new RuntimeException('payload ذخیره‌شده قابل خواندن نیست.');
        }

        return $data;
    }

    private function fail(ClientLogInboxItem $row, Throwable $e, bool $permanent = false): string
    {
        report($e);

        $max = max(1, (int) config('client_logs.max_attempts', 5));
        $dead = $permanent || (int) $row->attempts >= $max;

        $row->forceFill([
            'status'          => $dead ? ClientLogInboxItem::STATUS_DEAD : ClientLogInboxItem::STATUS_FAILED,
            'locked_at'       => null,
            'last_error'      => mb_substr(class_basename($e) . ': ' . $e->getMessage(), 0, 500),
            'next_attempt_at' => $dead ? null : Carbon::now('UTC')->addSeconds($this->backoffSeconds((int) $row->attempts)),
        ])->save();

        if ($dead) {
            $this->health->raiseDead($row);

            return 'dead';
        }

        return 'failed';
    }

    /** backoff پله‌ای با jitter ±۲۰٪ */
    private function backoffSeconds(int $attempt): int
    {
        /** @var list<int> $steps */
        $steps = array_values((array) config('client_logs.backoff', [60]));
        $base = (int) ($steps[min(max($attempt, 1) - 1, count($steps) - 1)] ?? 60);
        $jitter = (int) round($base * 0.2);

        return max(5, $base + random_int(-$jitter, $jitter));
    }

    private function dispatchJob(int $id): void
    {
        if (! (bool) config('client_logs.dispatch_job', false)) {
            return; // بدون worker: دستور process-inbox در scheduler پردازش می‌کند
        }

        try {
            ProcessClientLogBatch::dispatch($id);
        } catch (Throwable $e) {
            report($e); // ذخیره‌ی inbox قبلاً انجام شده؛ شکست dispatch نباید جواب را خراب کند
        }
    }

    /**
     * @param  list<string>  $accepted
     * @param  list<array{uuid:string, reason:string}>  $rejected
     * @return array{batch_id:string, accepted:list<string>, rejected:list<array{uuid:string, reason:string}>, status:string, duplicate:bool, conflict:bool}
     */
    private function duplicateResult(ClientLogInboxItem $existing, License $license, string $batchUuid, array $accepted, array $rejected): array
    {
        $sameLicense = (int) $existing->license_id === (int) $license->getKey();

        return [
            'batch_id'  => $batchUuid,
            'accepted'  => $sameLicense ? $accepted : [],
            'rejected'  => $sameLicense ? $rejected : [],
            'status'    => (string) $existing->status,
            'duplicate' => true,
            'conflict'  => ! $sameLicense,
        ];
    }
}
