<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\ClientApi\Support\ApiResponse;
use Modules\License\Models\Device;
use Modules\License\Models\License;
use Modules\Patch\Models\Patch;
use Modules\Patch\Services\PatchDeliveryService;
use Symfony\Component\HttpFoundation\Response;

class PatchClientController extends Controller
{
    public function __construct(private readonly PatchDeliveryService $delivery) {}

    // GET /api/v1/patches
    public function index(Request $request): JsonResponse
    {
        /** @var License $license */
        $license = $request->attributes->get('license');
        /** @var Device $device */
        $device = $request->attributes->get('device');

        if (! $license->isUsable()) {
            return ApiResponse::locked('LOCKED', 'لایسنس فعال نیست.', $license->status);
        }

        return ApiResponse::success([
            'patches' => $this->delivery->detailedForDevice($license, $device),
        ]);
    }

    // GET /api/v1/patches/{patch}/download  (لینک امضاشده + توکن)
    public function download(Request $request, string $patchCode): Response
    {
        /** @var License $license */
        $license = $request->attributes->get('license');
        /** @var Device $device */
        $device = $request->attributes->get('device');

        if (! $license->isUsable()) {
            return ApiResponse::locked('LOCKED', 'لایسنس فعال نیست.', $license->status);
        }

        $patch = Patch::query()->where('patch_code', $patchCode)->first();

        if ($patch === null || $patch->status !== 'published') {
            return ApiResponse::error('NOT_FOUND', 'پچ یافت نشد یا منتشر نشده است.', 404);
        }

        if (! $this->delivery->isApplicable($patch, $license, $device)) {
            return ApiResponse::error('NOT_FOUND', 'این پچ برای دستگاه شما قابل اعمال نیست.', 404);
        }

        return $this->delivery->streamDownload($patch, $license, $device, $request);
    }

    // POST /api/v1/patches/{patch}/status
    public function reportStatus(Request $request, string $patchCode): JsonResponse
    {
        /** @var License $license */
        $license = $request->attributes->get('license');
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $data = $request->validate([
            'status'         => ['required', 'in:offered,downloading,downloaded,applying,applied,failed,rolled_back'],
            'version_before' => ['nullable', 'string', 'max:32'],
            'version_after'  => ['nullable', 'string', 'max:32'],
            'error_message'  => ['nullable', 'string', 'max:2000'],
        ]);

        $patch = Patch::query()->where('patch_code', $patchCode)->first();

        if ($patch === null) {
            return ApiResponse::error('NOT_FOUND', 'پچ یافت نشد.', 404);
        }

        $state = $this->delivery->recordStatus($patch, $license, $device, $data);

        return ApiResponse::success([
            'recorded'      => true,
            'blocked'       => (bool) $state->is_blocked,
            'failure_count' => (int) $state->failure_count,
        ]);
    }
}
