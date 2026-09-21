<?php

declare(strict_types=1);

namespace Modules\Patch\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Services\ServerSettings;
use Modules\Base\Support\SemVer;
use Modules\License\Models\Device;
use Modules\License\Models\License;
use Modules\Patch\Models\DevicePatchStatus;
use Modules\Patch\Models\Patch;
use Modules\Patch\Models\PatchDownload;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

// انتخاب پچ‌های قابل اعمال، تولید لینک امضاشده، stream با Range و ثبت وضعیت
class PatchDeliveryService
{
    public function __construct(
        private readonly ServerSettings $settings,
        private readonly AuditLogger $audit,
    ) {}

    /** @return \Illuminate\Support\Collection<int, Patch> */
    public function applicablePatches(License $license, Device $device)
    {
        if (! $license->isUsable()) {
            return collect();
        }

        $versionCode = $device->app_version_code;
        $maxFailures = $this->settings->patchMaxFailures();

        $patches = Patch::query()
            ->published()
            ->where('from_min_code', '<=', $versionCode)
            ->where('from_max_code', '>=', $versionCode)
            ->where('to_version_code', '>', $versionCode)
            // هدف‌گیری: همه، پلن‌های مشخص یا لایسنس‌های مشخص
            ->where(function ($query) use ($license): void {
                $query->where('target_type', 'all')
                    ->orWhere(fn ($q) => $q->where('target_type', 'plans')
                        ->whereHas('targetPlans', fn ($p) => $p->where('plans.id', $license->plan_id)))
                    ->orWhere(fn ($q) => $q->where('target_type', 'licenses')
                        ->whereHas('targetLicenses', fn ($l) => $l->where('licenses.id', $license->getKey())));
            })
            // قبلاً نصب نشده و مسدود نشده باشد
            ->whereDoesntHave('deviceStatuses', function ($query) use ($device, $maxFailures): void {
                $query->where('device_id', $device->getKey())
                    ->where(function ($q) use ($maxFailures): void {
                        $q->where('status', 'applied')
                            ->orWhere('is_blocked', true)
                            ->orWhere('failure_count', '>=', $maxFailures);
                    });
            })
            ->with(['dependencies:id,patch_code', 'scripts', 'files'])
            ->orderBy('to_version_code')
            ->get();

        // پچ‌هایی که پیش‌نیاز نصب‌نشده دارند حذف می‌شوند
        $appliedPatchIds = DevicePatchStatus::query()
            ->where('device_id', $device->getKey())
            ->where('status', 'applied')
            ->pluck('patch_id')
            ->all();

        return $patches->filter(function (Patch $patch) use ($appliedPatchIds): bool {
            foreach ($patch->dependencies as $dependency) {
                if (! in_array($dependency->getKey(), $appliedPatchIds, true)) {
                    return false;
                }
            }

            return true;
        })->values();
    }

    public function isApplicable(Patch $patch, License $license, Device $device): bool
    {
        return $this->applicablePatches($license, $device)
            ->contains(fn (Patch $item) => $item->getKey() === $patch->getKey());
    }

    /** خلاصه پچ‌ها برای heartbeat @return array<int, array<string, mixed>> */
    public function summaryForDevice(License $license, Device $device): array
    {
        return $this->applicablePatches($license, $device)
            ->map(fn (Patch $patch): array => [
                'patch_code'       => $patch->patch_code,
                'title'            => $patch->title,
                'to_version'       => $patch->to_version,
                'mandatory'        => $patch->is_mandatory,
                'requires_restart' => $patch->requires_restart,
                'size'             => $patch->file_size,
            ])->all();
    }

    /** فهرست کامل با manifest، امضا و لینک دانلود @return array<int, array<string, mixed>> */
    public function detailedForDevice(License $license, Device $device): array
    {
        $ttl = $this->settings->patchLinkTtlMinutes();

        return $this->applicablePatches($license, $device)->map(function (Patch $patch) use ($ttl, $device): array {
            $expiresAt = Carbon::now('UTC')->addMinutes($ttl);

            $this->markOffered($patch, $device);

            return [
                'patch_code'          => $patch->patch_code,
                'title'               => $patch->title,
                'description'         => $patch->description,
                'type'                => $patch->type,
                'from_min'            => $patch->from_min,
                'from_max'            => $patch->from_max,
                'to_version'          => $patch->to_version,
                'requires_restart'    => $patch->requires_restart,
                'mandatory'           => $patch->is_mandatory,
                'size'                => $patch->file_size,
                'sha256'              => $patch->file_sha256,
                'manifest'            => $patch->manifest,
                'signature'           => $patch->signature,
                'kid'                 => $patch->signing_kid,
                'depends_on'          => $patch->dependencies->pluck('patch_code')->all(),
                'download_url'        => URL::temporarySignedRoute('api.v1.patches.download', $expiresAt, [
                    'patchCode' => $patch->patch_code,
                ]),
                'download_expires_at' => $expiresAt->toIso8601String(),
            ];
        })->all();
    }

    public function streamDownload(Patch $patch, License $license, Device $device, Request $request): Response
    {
        $disk = Storage::disk($patch->file_disk);

        if (! $disk->exists($patch->file_path)) {
            return response()->json(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'فایل پچ موجود نیست.']], 404);
        }

        $absolutePath = (string) $disk->path($patch->file_path);
        $size  = (int) $disk->size($patch->file_path);
        $start = 0;
        $end   = $size - 1;
        $status = 200;
        $rangeHeader = (string) $request->header('Range', '');

        // پشتیبانی از Range برای ادامه دانلود
        if ($rangeHeader !== '' && preg_match('/bytes=(\d*)-(\d*)/', $rangeHeader, $matches) === 1) {
            $start = $matches[1] === '' ? 0 : (int) $matches[1];
            $end   = $matches[2] === '' ? $size - 1 : (int) $matches[2];

            if ($start > $end || $start >= $size) {
                return response('', 416, ['Content-Range' => "bytes */{$size}"]);
            }

            $status = 206;
        }

        $length = $end - $start + 1;

        $download = PatchDownload::query()->create([
            'patch_id'     => $patch->getKey(),
            'device_id'    => $device->getKey(),
            'license_id'   => $license->getKey(),
            'ip'           => $request->ip(),
            'user_agent'   => mb_substr((string) $request->userAgent(), 0, 255),
            'range_header' => $rangeHeader !== '' ? mb_substr($rangeHeader, 0, 128) : null,
            'bytes_sent'   => $length,
            'status'       => 'started',
            'created_at'   => Carbon::now('UTC'),
        ]);

        $this->audit->patch($patch, $device, 'patch.download_started', 'شروع دانلود پچ', [
            'range' => $rangeHeader, 'bytes' => $length,
        ]);

        $response = new StreamedResponse(function () use ($absolutePath, $start, $length, $download): void {
            $handle = fopen($absolutePath, 'rb');

            if ($handle === false) {
                return;
            }

            fseek($handle, $start);
            $remaining = $length;
            $chunkSize = 1024 * 512;

            while ($remaining > 0 && ! feof($handle)) {
                $read = fread($handle, (int) min($chunkSize, $remaining));

                if ($read === false) {
                    break;
                }

                echo $read;
                flush();
                $remaining -= strlen($read);
            }

            fclose($handle);
            $download->forceFill(['status' => $remaining === 0 ? 'completed' : 'failed'])->save();
        }, $status, [
            'Content-Type'         => 'application/zip',
            'Content-Length'       => (string) $length,
            'Content-Disposition'  => 'attachment; filename="' . $patch->patch_code . '.zip"',
            'Accept-Ranges'        => 'bytes',
            'X-GS-Patch-Sha256'    => $patch->file_sha256,
            'X-GS-Patch-Signature' => $patch->signature,
            'X-GS-Patch-Kid'       => $patch->signing_kid,
        ]);

        if ($status === 206) {
            $response->headers->set('Content-Range', "bytes {$start}-{$end}/{$size}");
        }

        return $response;
    }

    /** @param array{status: string, version_before?: string|null, version_after?: string|null, error_message?: string|null} $data */
    public function recordStatus(Patch $patch, License $license, Device $device, array $data): DevicePatchStatus
    {
        return DB::transaction(function () use ($patch, $device, $data): DevicePatchStatus {
            /** @var DevicePatchStatus $state */
            $state = DevicePatchStatus::query()->firstOrCreate(
                ['device_id' => $device->getKey(), 'patch_id' => $patch->getKey()],
                ['status' => 'offered', 'offered_at' => Carbon::now('UTC')],
            );

            $status = $data['status'];
            $state->status = $status;
            $state->version_before = $data['version_before'] ?? $state->version_before;
            $state->version_after = $data['version_after'] ?? $state->version_after;
            $state->last_reported_at = Carbon::now('UTC');

            if ($status === 'applying') {
                $state->attempts = $state->attempts + 1;
            }

            if ($status === 'applied') {
                $state->failure_count = 0;
                $state->error_message = null;
                $state->applied_at = Carbon::now('UTC');

                // نسخه ثبت‌شده دستگاه به نسخه مقصد پچ به‌روزرسانی می‌شود
                $device->forceFill([
                    'app_version'      => $data['version_after'] ?? $patch->to_version,
                    'app_version_code' => SemVer::toCode($data['version_after'] ?? $patch->to_version),
                ])->save();
            }

            if (in_array($status, ['failed', 'rolled_back'], true)) {
                $state->failure_count = $state->failure_count + 1;
                $state->error_message = $data['error_message'] ?? null;

                if ($state->failure_count >= $this->settings->patchMaxFailures()) {
                    $state->is_blocked = true;

                    $this->audit->security('patch_repeated_failure', 'توقف پیشنهاد پچ پس از شکست‌های پیاپی', [
                        'patch_code'    => $patch->patch_code,
                        'device_id'     => $device->getKey(),
                        'failure_count' => $state->failure_count,
                    ], 'warning');
                }
            }

            $state->save();

            $this->audit->patch($patch, $device, 'patch.status_' . $status, 'گزارش وضعیت پچ', [
                'version_before' => $state->version_before,
                'version_after'  => $state->version_after,
                'error'          => $state->error_message,
            ]);

            return $state;
        });
    }

    private function markOffered(Patch $patch, Device $device): void
    {
        DevicePatchStatus::query()->firstOrCreate(
            ['device_id' => $device->getKey(), 'patch_id' => $patch->getKey()],
            ['status' => 'offered', 'offered_at' => Carbon::now('UTC')],
        );
    }
}
