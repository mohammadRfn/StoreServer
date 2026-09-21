<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;
use Modules\Base\Services\ServerSettings;
use Modules\ClientApi\Http\Requests\ActivationRequestRequest;
use Modules\ClientApi\Support\ApiResponse;
use Modules\License\Models\ActivationRequest;
use Modules\License\Services\ActivationService;
use Modules\License\Services\TokenService;
use Modules\Plan\Services\EntitlementService;

class ActivationController extends Controller
{
    public function __construct(
        private readonly ActivationService $activation,
        private readonly TokenService $tokens,
        private readonly ServerSettings $settings,
        private readonly EntitlementService $entitlements,
    ) {}

    // POST /api/v1/activation/request
    public function request(ActivationRequestRequest $request): JsonResponse
    {
        try {
            $activationRequest = $this->activation->createRequest(
                mb_strtolower($request->string('fingerprint')->toString()),
                (array) $request->input('system_info', []),
                $request->string('app_version')->toString(),
                $request->input('customer_name'),
                $request->input('customer_phone'),
                $request->ip(),
            );
        } catch (ValidationException $e) {
            return ApiResponse::error('ALREADY_ACTIVATED', 'این دستگاه قبلاً فعال شده است.', 409, $e->errors());
        }

        return ApiResponse::success([
            'request_uuid'      => $activationRequest->uuid,
            'status'            => $activationRequest->status,
            'poll_after_seconds' => $this->settings->int('activation_poll_seconds', 30),
        ], 201);
    }

    // GET /api/v1/activation/status/{uuid}
    public function status(Request $request, string $uuid): JsonResponse
    {
        $activationRequest = ActivationRequest::query()
            ->with(['license.plan', 'license.device'])
            ->where('uuid', $uuid)
            ->first();

        if ($activationRequest === null) {
            return ApiResponse::error('NOT_FOUND', 'درخواست یافت نشد.', 404);
        }

        $headerFingerprint = mb_strtolower((string) $request->header('X-GS-Fingerprint', ''));

        if ($headerFingerprint !== '' && $headerFingerprint !== $activationRequest->fingerprint) {
            return ApiResponse::error('FINGERPRINT_MISMATCH', 'این درخواست متعلق به دستگاه دیگری است.', 403);
        }

        if ($activationRequest->status === 'rejected') {
            return ApiResponse::success([
                'status' => 'rejected',
                'reason' => $activationRequest->reject_reason,
            ]);
        }

        if ($activationRequest->status !== 'approved' || $activationRequest->license === null) {
            return ApiResponse::success([
                'status'             => $activationRequest->status,
                'poll_after_seconds' => $this->settings->int('activation_poll_seconds', 30),
            ]);
        }

        $license = $activationRequest->license;
        $device  = $license->device;

        if ($device === null) {
            return ApiResponse::error('DEVICE_NOT_BOUND', 'دستگاه به لایسنس متصل نشده است.', 403);
        }

        return ApiResponse::success([
            'status'                     => 'approved',
            'license_uuid'               => $license->uuid,
            'token'                      => $this->tokens->issue($license, $device),
            'plan'                       => $license->plan?->code,
            'entitlements'               => $this->entitlements->forLicense($license),
            'expires_at'                 => $license->expires_at?->toIso8601String(),
            'valid_until'                => $this->tokens->validUntilFor()->toIso8601String(),
            'heartbeat_interval_minutes' => $this->settings->heartbeatIntervalMinutes(),
        ]);
    }

    // POST /api/v1/activation/redeem
    public function redeem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'        => ['required', 'string', 'max:64'],
            'fingerprint' => ['required', 'string', 'size:64', 'regex:/^[a-f0-9]{64}$/i'],
            'app_version' => ['required', 'string', 'max:32'],
            'system_info' => ['required', 'array'],
        ]);

        try {
            $result = $this->activation->redeemCode(
                $data['code'],
                mb_strtolower($data['fingerprint']),
                (array) $data['system_info'],
                $data['app_version'],
                $request->ip(),
            );
        } catch (ValidationException $e) {
            $errors = $e->errors();

            if (isset($errors['fingerprint'])) {
                return ApiResponse::error('ALREADY_ACTIVATED', 'این دستگاه قبلاً فعال شده است.', 409);
            }

            return ApiResponse::error('CODE_INVALID', 'کد نامعتبر یا مصرف‌شده است.', 422);
        }

        $license = $result['license'];

        return ApiResponse::success([
            'status'                     => 'approved',
            'license_uuid'               => $license->uuid,
            'token'                      => $result['token'],
            'plan'                       => $license->plan?->code,
            'entitlements'               => $this->entitlements->forLicense($license),
            'expires_at'                 => $license->expires_at?->toIso8601String(),
            'valid_until'                => $this->tokens->validUntilFor()->toIso8601String(),
            'heartbeat_interval_minutes' => $this->settings->heartbeatIntervalMinutes(),
        ]);
    }
}
