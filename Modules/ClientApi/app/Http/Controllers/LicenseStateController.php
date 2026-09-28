<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\ClientApi\Support\ApiResponse;
use Modules\License\Models\License;
use Modules\Plan\Services\EntitlementService;

class LicenseStateController extends Controller
{
    public function __construct(private readonly EntitlementService $entitlements) {}

    // GET /api/v1/license/state — پاسخ سبک برای تشخیص تغییر (بدون ثبت heartbeat و بدون صدور توکن)
    public function __invoke(Request $request): JsonResponse
    {
        /** @var License $license */
        $license = $request->attributes->get('license');

        $list = array_values($this->entitlements->forLicense($license));
        sort($list);

        return ApiResponse::success([
            'locked' => $license->isLocked(),
            'hash'   => md5(json_encode([$license->plan?->code, $list])),
        ]);
    }
}