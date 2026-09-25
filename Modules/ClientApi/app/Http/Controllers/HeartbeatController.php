<?php

declare(strict_types=1);

namespace Modules\ClientApi\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Carbon;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Services\ServerSettings;
use Modules\Base\Support\SemVer;
use Modules\ClientApi\Support\ApiResponse;
use Modules\License\Models\Device;
use Modules\License\Models\DeviceModuleUsage;
use Modules\License\Models\License;
use Modules\License\Services\TokenService;
use Modules\Patch\Services\PatchDeliveryService;
use Modules\Plan\Models\GameshopModule;
use Modules\Plan\Services\EntitlementService;

class HeartbeatController extends Controller
{
    public function __construct(
        private readonly TokenService $tokens,
        private readonly ServerSettings $settings,
        private readonly EntitlementService $entitlements,
        private readonly PatchDeliveryService $patches,
        private readonly AuditLogger $audit,
    ) {}

    // POST /api/v1/heartbeat
    public function __invoke(Request $request): JsonResponse
    {
        $startedAt = microtime(true);

        /** @var License $license */
        $license = $request->attributes->get('license');
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $data = $request->validate([
            'app_version'                  => ['required', 'string', 'max:32'],
            'stats'                        => ['sometimes', 'array'],
            'stats.modules'                => ['sometimes', 'array'],
            'stats.modules.*.hits'         => ['sometimes', 'integer', 'min:0'],
            'stats.modules.*.last_used_at' => ['sometimes', 'date'],
        ]);

        // انقضای تنبل: اگر تاریخ گذشته باشد وضعیت به expired تغییر می‌کند
        if ($license->status === License::STATUS_ACTIVE
            && $license->expires_at !== null
            && $license->expires_at->isPast()) {
            $license->forceFill(['status' => License::STATUS_EXPIRED])->save();
            $this->audit->license($license, 'license.expired', 'لایسنس در heartbeat منقضی شد', [], $device, 'warning');
        }

        // ثبت نسخه گزارش‌شده و آخرین اتصال
        $previousVersion = $device->app_version;
        $device->forceFill([
            'app_version'       => $data['app_version'],
            'app_version_code'  => SemVer::toCode($data['app_version']),
            'last_ip'           => $request->ip(),
            'last_heartbeat_at' => Carbon::now('UTC'),
        ])->save();

        if ($previousVersion !== $data['app_version']) {
            $this->audit->device($device, 'device.version_changed', 'تغییر نسخه اپ', [
                'from' => $previousVersion, 'to' => $data['app_version'],
            ]);
        }

        // مصرف ماژول‌ها را حتی وقتی قفل است هم ثبت کن (تا آخرین رفتار مشتری قبل از قفل دیده شود)
        $usedModules = $this->recordModuleUsage($device, (array) ($data['stats']['modules'] ?? []));
        $planCode    = $license->plan?->code;

        // لایسنس قفل: هیچ توکن و پچی داده نمی‌شود
        if ($license->isLocked()) {
            $this->audit->heartbeat(
                $license, $device, $data['app_version'], $license->status,
                0, false, (int) ((microtime(true) - $startedAt) * 1000),
                $planCode, $usedModules,
            );

            return ApiResponse::locked(
                match ($license->status) {
                    License::STATUS_SUSPENDED => 'LICENSE_SUSPENDED',
                    License::STATUS_REVOKED   => 'LICENSE_REVOKED',
                    default                   => 'LICENSE_EXPIRED',
                },
                match ($license->status) {
                    License::STATUS_SUSPENDED => 'لایسنس توسط مدیر غیرفعال شده است.',
                    License::STATUS_REVOKED   => 'لایسنس باطل شده است.',
                    default                   => 'اعتبار لایسنس به پایان رسیده است؛ لطفاً تمدید کنید.',
                },
                $license->status,
            );
        }

        $license->forceFill(['last_seen_at' => Carbon::now('UTC')])->save();

        $patchSummaries = $this->patches->summaryForDevice($license, $device);
        $token = $this->tokens->issue($license, $device);

        $this->audit->heartbeat(
            $license, $device, $data['app_version'], $license->status,
            count($patchSummaries), true, (int) ((microtime(true) - $startedAt) * 1000),
            $planCode, $usedModules,
        );

        return ApiResponse::success([
            'license_status'             => $license->status,
            'locked'                     => false,
            'token'                      => $token,
            'plan'                       => $planCode,
            'entitlements'               => $this->entitlements->forLicense($license),
            'expires_at'                 => $license->expires_at?->toIso8601String(),
            'valid_until'                => $this->tokens->validUntilFor()->toIso8601String(),
            'heartbeat_interval_minutes' => $this->settings->heartbeatIntervalMinutes(),
            'patches'                    => $patchSummaries,
        ]);
    }

    /**
     * مصرف ماژول‌های گزارش‌شده در این heartbeat را روی دستگاه تجمیع می‌کند و
     * فهرست کلیدهای استفاده‌شده را برای ثبت در heartbeat_logs برمی‌گرداند.
     *
     * @param array<string, mixed> $modules
     * @return list<string>
     */
    private function recordModuleUsage(Device $device, array $modules): array
    {
        if ($modules === []) {
            return [];
        }

        // فقط کلیدهای واقعاً موجود در کاتالوگ پذیرفته می‌شوند؛ یک اپ دستکاری‌شده
        // نمی‌تواند کلید جعلی در آمار مصرف تزریق کند
        static $validKeys = null;
        $validKeys ??= GameshopModule::query()->pluck('key')->all();

        $used = [];

        foreach ($modules as $moduleKey => $info) {
            $moduleKey = mb_substr((string) $moduleKey, 0, 64);
            $hits      = max(0, (int) (is_array($info) ? ($info['hits'] ?? 0) : 0));

            if ($moduleKey === '' || $hits === 0 || ! in_array($moduleKey, $validKeys, true)) {
                continue;
            }

            $lastUsedAt = is_array($info) && isset($info['last_used_at'])
                ? Carbon::parse((string) $info['last_used_at'])->utc()
                : Carbon::now('UTC');

            $row = DeviceModuleUsage::query()->firstOrNew([
                'device_id'  => $device->getKey(),
                'module_key' => $moduleKey,
            ]);

            $row->use_count     = ($row->exists ? $row->use_count : 0) + $hits;
            $row->last_used_at  = $lastUsedAt;
            $row->first_used_at ??= $lastUsedAt;
            $row->save();

            $used[] = $moduleKey;
        }

        return $used;
    }
}