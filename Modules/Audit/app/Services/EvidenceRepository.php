<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Audit\Models\AuditLog;
use Modules\License\Models\License;

/**
 * ذخیره‌ی تصویر ثابت (snapshot) هر گزارش مدرک روی دیسک خصوصی + بررسی صحت آن.
 *
 * هش SHA-256 فایل در سه جا نگه داشته می‌شود: کنار فایل (.meta.json)، در جدول
 * فقط‌افزودنی audit_logs (action = evidence.generate) و در نمای گزارش. اگر فایل
 * بعداً دست‌کاری شود با هر دو مقدار ثبت‌شده نمی‌خواند.
 */
class EvidenceRepository
{
    private const FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
        | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR;

    /**
     * @param  array<string, mixed>  $report
     * @return array{id: string, sha256: string, bytes: int}
     */
    public function save(License $license, array $report): array
    {
        $id    = (string) $report['meta']['report_id'];
        $bytes = json_encode($report, self::FLAGS);
        $sha   = hash('sha256', $bytes);

        $disk = Storage::disk('local');
        $disk->put($this->path($license, $id), $bytes);
        $disk->put($this->path($license, $id, 'meta.json'), json_encode([
            'report_id'    => $id,
            'title'        => $report['meta']['case']['title'] ?? '',
            'reference'    => $report['meta']['case']['reference'] ?? null,
            'generated_at' => $report['meta']['generated_at'],
            'generated_by' => $report['meta']['generated_by']['name'] ?? null,
            'sha256'       => $sha,
            'bytes'        => strlen($bytes),
        ], self::FLAGS));

        return ['id' => $id, 'sha256' => $sha, 'bytes' => strlen($bytes)];
    }

    /**
     * @return array{report: array<string, mixed>, raw: string, meta: array<string, mixed>, integrity: array<string, mixed>}|null
     */
    public function find(License $license, string $id): ?array
    {
        if (! Str::isUuid($id)) {
            return null;
        }

        $disk = Storage::disk('local');

        if (! $disk->exists($this->path($license, $id))) {
            return null;
        }

        $raw    = (string) $disk->get($this->path($license, $id));
        $meta   = $disk->exists($this->path($license, $id, 'meta.json'))
            ? (array) json_decode((string) $disk->get($this->path($license, $id, 'meta.json')), true)
            : [];
        $actual = hash('sha256', $raw);

        $loggedSha = null;

        try {
            $logged = AuditLog::query()
                ->where('action', 'evidence.generate')
                ->where('entity_type', 'License')
                ->where('entity_id', $license->getKey())
                ->where('new_values->report_id', $id)
                ->value('new_values');

            if (is_string($logged)) {
                $logged = json_decode($logged, true);
            }

            $loggedSha = is_array($logged) ? ($logged['sha256'] ?? null) : null;
        } catch (\Throwable) {
            // اگر موتور دیتابیس کوئری JSON را نپذیرفت، صحت فقط با هش کنار فایل سنجیده می‌شود
        }

        return [
            'report' => (array) json_decode($raw, true),
            'raw'    => $raw,
            'meta'   => $meta,
            'integrity' => [
                'sha256'        => $actual,
                'bytes'         => strlen($raw),
                'stored_sha256' => $meta['sha256'] ?? null,
                'logged_sha256' => $loggedSha,
                'file_ok'       => isset($meta['sha256']) && hash_equals((string) $meta['sha256'], $actual),
                // null = ثبتی در audit_logs پیدا نشد
                'log_ok'        => $loggedSha === null ? null : hash_equals((string) $loggedSha, $actual),
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public function list(License $license): array
    {
        $disk  = Storage::disk('local');
        $items = [];

        foreach ($disk->files('evidence/' . $license->uuid) as $file) {
            if (! str_ends_with($file, '.meta.json')) {
                continue;
            }

            $meta = json_decode((string) $disk->get($file), true);

            if (is_array($meta)) {
                $items[] = $meta;
            }
        }

        usort($items, static fn (array $a, array $b): int => strcmp((string) $b['generated_at'], (string) $a['generated_at']));

        return $items;
    }

    private function path(License $license, string $id, string $ext = 'json'): string
    {
        return "evidence/{$license->uuid}/{$id}.{$ext}";
    }
}