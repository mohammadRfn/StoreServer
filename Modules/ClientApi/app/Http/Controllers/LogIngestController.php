<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Audit\Services\AlertFeed;
use Modules\Audit\Services\ClientChainVerifier;
use Modules\Audit\Services\ClientLogQuota;
use Modules\Audit\Services\ClientLogIngestor;
use Modules\ClientApi\Http\Requests\IngestLogsRequest;
use Modules\ClientApi\Support\ApiResponse;
use Modules\License\Models\Device;
use Modules\License\Models\License;

class LogIngestController extends Controller
{
    public function __construct(
        private readonly ClientLogIngestor $ingestor,
        private readonly ClientChainVerifier $chains,
        private readonly AlertFeed $alerts,
        private readonly ClientLogQuota $quota,
    ) {}

    // POST /api/v1/logs/ingest
    public function ingest(IngestLogsRequest $request): JsonResponse
    {
        /** @var License $license */
        $license = $request->attributes->get('license');
        /** @var Device|null $device */
        $device = $request->attributes->get('device');

        if ($this->quota->exceeded($license, $device, (string) $request->input('batch.uuid'), count((array) $request->input('logs', [])))) {
            return ApiResponse::error('QUOTA_EXCEEDED', 'سقف روزانه‌ی ارسال لاگ برای این لایسنس پر شده است.', 429);
        }

        $result = $this->ingestor->ingest($license, $device, $request->validated(), [
            'ip'            => $request->ip(),
            'payload_bytes' => (int) $request->attributes->get('raw_payload_bytes', strlen((string) $request->getContent())),
        ]);

        // تشخیص فوری fork/شکست زنجیره؛ خطا هرگز نباید ارسال لاگ را خراب کند
        if ($device !== null) {
            try {
                $this->chains->verifyDevice((int) $device->getKey());
                $this->alerts->resolve((int) $device->getKey(), ['client_logs_silent']); // دوباره لاگ فرستاد
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return ApiResponse::success([
            'batch_id' => $result['batch_id'],
            'accepted' => $result['accepted'],
            'rejected' => $result['rejected'],
        ]);
    }

    // POST /api/v1/logs/ping  (تست اتصال/احراز هویت پیش از ارسال دسته واقعی)
    public function ping(Request $request): JsonResponse
    {
        /** @var License $license */
        $license = $request->attributes->get('license');
        /** @var Device|null $device */
        $device = $request->attributes->get('device');

        return ApiResponse::success([
            'service'        => 'storeserver-logs',
            'license_status' => $license->status,
            'device'         => $device?->fingerprint,
            'server_time'    => now()->utc()->toIso8601String(),
        ]);
    }
}