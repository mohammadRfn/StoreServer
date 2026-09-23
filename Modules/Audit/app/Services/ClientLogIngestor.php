<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Audit\Models\ClientAuditBatch;
use Modules\Audit\Models\ClientAuditLog;
use Modules\License\Models\Device;
use Modules\License\Models\License;

/**
 * ثبت دسته‌ی لاگ دریافتی از گیم‌استور در جداول client_audit_batches / client_audit_logs.
 *
 * تضمین‌ها:
 *  - Idempotent روی batch.uuid: اگر همین batch قبلاً پردازش شده (retry کلاینت به‌خاطر
 *    قطعی شبکه بعد از پاسخ موفق)، بدون درج مجدد همان نتیجه‌ی قبلی برگردانده می‌شود.
 *  - Idempotent روی هر log.uuid: چون uuid ستون UNIQUE دارد، درج تکراری با
 *    insertOrIgnore نادیده گرفته و به‌عنوان «قبلاً پذیرفته‌شده» در accepted لحاظ می‌شود.
 */
class ClientLogIngestor
{
    /**
     * @param  array<string, mixed>  $payload  بدنه‌ی اعتبارسنجی‌شده (schema/batch/client/logs)
     * @param  array<string, mixed>  $meta     ip و غیره که از Request می‌آید
     * @return array{batch_id:string, accepted:list<string>, rejected:list<array{uuid:string, reason:string}>}
     */
    public function ingest(License $license, ?Device $device, array $payload, array $meta = []): array
    {
        $batchUuid = (string) ($payload['batch']['uuid'] ?? '');

        /** @var ClientAuditBatch|null $existing */
        $existing = ClientAuditBatch::query()->where('uuid', $batchUuid)->first();

        if ($existing !== null) {
            // batch قبلاً کامل پردازش شده؛ همان نتیجه را دوباره برمی‌گردانیم (بدون درج مجدد)
            return [
                'batch_id' => $existing->uuid,
                'accepted' => ClientAuditLog::query()
                    ->where('batch_id', $existing->id)
                    ->pluck('uuid')
                    ->all(),
                'rejected' => [],
            ];
        }

        $logs = collect($payload['logs'] ?? []);

        return DB::transaction(function () use ($license, $device, $payload, $logs, $batchUuid, $meta): array {
            $batch = ClientAuditBatch::query()->create([
                'license_id'         => $license->getKey(),
                'device_id'          => $device?->getKey(),
                'uuid'               => $batchUuid,
                'schema_version'     => (string) ($payload['schema'] ?? ''),
                'client_app_version' => (string) ($payload['client']['app_version'] ?? ''),
                'log_count'          => $logs->count(),
                'checksum'           => (string) ($payload['batch']['checksum'] ?? ''),
                'payload_bytes'      => (int) ($meta['payload_bytes'] ?? 0),
                'ip'                 => $meta['ip'] ?? null,
                'received_at'        => Carbon::now('UTC'),
            ]);

            [$accepted, $rejected] = $this->storeLogs($license, $device, $batch, $logs);

            $batch->forceFill([
                'accepted_count' => count($accepted),
                'rejected_count' => count($rejected),
            ])->save();

            return [
                'batch_id' => $batch->uuid,
                'accepted' => $accepted,
                'rejected' => $rejected,
            ];
        });
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $logs
     * @return array{0: list<string>, 1: list<array{uuid:string, reason:string}>}
     */
    private function storeLogs(License $license, ?Device $device, ClientAuditBatch $batch, Collection $logs): array
    {
        $accepted = [];
        $rejected = [];
        $now = Carbon::now('UTC');

        foreach ($logs as $log) {
            $uuid = (string) ($log['uuid'] ?? '');

            if ($uuid === '') {
                $rejected[] = ['uuid' => '', 'reason' => 'MISSING_UUID'];

                continue;
            }

            $entity = (array) ($log['entity'] ?? []);
            $actor = (array) ($log['actor'] ?? []);
            $req = (array) ($log['request'] ?? []);
            $changes = (array) ($log['changes'] ?? []);
            $source = (array) ($log['source'] ?? []);
            $integrity = (array) ($log['integrity'] ?? []);

            $row = [
                'license_id'     => $license->getKey(),
                'device_id'      => $device?->getKey(),
                'batch_id'       => $batch->id,
                'uuid'           => $uuid,

                'channel'        => mb_substr((string) ($log['channel'] ?? 'system'), 0, 32),
                'level'          => mb_substr((string) ($log['level'] ?? 'info'), 0, 16),
                'action'         => mb_substr((string) ($log['action'] ?? ''), 0, 191),
                'description'    => isset($log['description']) ? mb_substr((string) $log['description'], 0, 2000) : null,

                'entity_type'    => isset($entity['type']) ? mb_substr((string) $entity['type'], 0, 191) : null,
                'entity_id'      => isset($entity['id']) ? (int) $entity['id'] : null,
                'entity_label'   => isset($entity['label']) ? mb_substr((string) $entity['label'], 0, 255) : null,

                'actor_id'       => isset($actor['id']) ? (int) $actor['id'] : null,
                'actor_type'     => isset($actor['type']) ? mb_substr((string) $actor['type'], 0, 32) : null,
                'actor_name'     => isset($actor['name']) ? mb_substr((string) $actor['name'], 0, 191) : null,
                'actor_email'    => isset($actor['email']) ? mb_substr((string) $actor['email'], 0, 191) : null,

                'request_id'     => isset($req['id']) ? mb_substr((string) $req['id'], 0, 64) : null,
                'correlation_id' => isset($req['correlation_id']) ? mb_substr((string) $req['correlation_id'], 0, 64) : null,
                'session_id'     => isset($req['session_id']) ? mb_substr((string) $req['session_id'], 0, 64) : null,
                'method'         => isset($req['method']) ? mb_substr((string) $req['method'], 0, 10) : null,
                'route'          => isset($req['route']) ? mb_substr((string) $req['route'], 0, 191) : null,
                'url'            => isset($req['url']) ? mb_substr((string) $req['url'], 0, 500) : null,
                'ip'             => isset($req['ip']) ? mb_substr((string) $req['ip'], 0, 45) : null,
                'user_agent'     => isset($req['user_agent']) ? mb_substr((string) $req['user_agent'], 0, 500) : null,
                'status_code'    => isset($req['status_code']) ? (int) $req['status_code'] : null,
                'duration_ms'    => isset($req['duration_ms']) ? (int) $req['duration_ms'] : null,
                'memory_kb'      => isset($req['memory_kb']) ? (int) $req['memory_kb'] : null,

                'old_values'     => isset($changes['old']) ? json_encode($changes['old'], JSON_UNESCAPED_UNICODE) : null,
                'new_values'     => isset($changes['new']) ? json_encode($changes['new'], JSON_UNESCAPED_UNICODE) : null,
                'changed_keys'   => isset($changes['keys']) ? json_encode($changes['keys'], JSON_UNESCAPED_UNICODE) : null,
                'context'        => json_encode($log['context'] ?? [], JSON_UNESCAPED_UNICODE),
                'tags'           => json_encode($log['tags'] ?? [], JSON_UNESCAPED_UNICODE),

                'environment'    => isset($source['environment']) ? mb_substr((string) $source['environment'], 0, 32) : null,
                'app_version'    => isset($source['app_version']) ? mb_substr((string) $source['app_version'], 0, 32) : null,
                'hostname'       => isset($source['hostname']) ? mb_substr((string) $source['hostname'], 0, 191) : null,

                'sequence'       => isset($integrity['sequence']) ? (int) $integrity['sequence'] : null,
                'hash'           => isset($integrity['hash']) ? mb_substr((string) $integrity['hash'], 0, 64) : null,
                'previous_hash'  => isset($integrity['previous_hash']) ? mb_substr((string) $integrity['previous_hash'], 0, 64) : null,

                'occurred_at'    => isset($log['occurred_at']) ? Carbon::parse($log['occurred_at'])->utc() : $now,
                'received_at'    => $now,
                'created_at'     => $now,
            ];

            // insertOrIgnore به‌خاطر UNIQUE(uuid): تکراری بی‌سروصدا نادیده گرفته می‌شود
            $inserted = ClientAuditLog::query()->insertOrIgnore([$row]);

            if ($inserted > 0) {
                $accepted[] = $uuid;
            } else {
                // یا رکورد از batch دیگری قبلاً درج شده (تکراری واقعی)، یا خطای داده
                $accepted[] = $uuid; // idempotent: از دید کلاینت موفق تلقی می‌شود
            }
        }

        return [$accepted, $rejected];
    }
}