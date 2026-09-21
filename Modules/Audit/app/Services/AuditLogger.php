<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Modules\Audit\Models\ApiRequestLog;
use Modules\Audit\Models\AuditLog;
use Modules\Audit\Models\DeviceLog;
use Modules\Audit\Models\ErrorLog;
use Modules\Audit\Models\HeartbeatLog;
use Modules\Audit\Models\LicenseEventLog;
use Modules\Audit\Models\SecurityEvent;
use Modules\License\Models\Device;
use Modules\License\Models\License;
use Modules\Patch\Models\Patch;
use Throwable;

// سرویس مرکزی لاگ‌گیری ساختاریافته، جدا از لاگ پیش‌فرض لاراول
class AuditLogger
{
    /**
     * ثبت عمل ادمین در جدول فقط‌افزودنی audit_logs
     *
     * @param array<string, mixed>|null $old
     * @param array<string, mixed>|null $new
     */
    public function log(
        string $action,
        string $description,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $old = null,
        ?array $new = null,
    ): AuditLog {
        $user = Auth::user();

        return AuditLog::query()->create([
            'user_id'     => $user?->getKey(),
            'user_name'   => $user?->name,
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'description' => $description,
            'old_values'  => $this->sanitize($old),
            'new_values'  => $this->sanitize($new),
            'ip'          => request()?->ip(),
            'user_agent'  => mb_substr((string) request()?->userAgent(), 0, 255),
            'request_id'  => $this->requestId(),
            'created_at'  => Carbon::now('UTC'),
        ]);
    }

    /** @param array<string, mixed> $context */
    public function license(
        ?License $license,
        string $event,
        string $message,
        array $context = [],
        ?Device $device = null,
        string $severity = 'info',
    ): LicenseEventLog {
        return LicenseEventLog::query()->create([
            'license_id' => $license?->getKey(),
            'device_id'  => $device?->getKey(),
            'event'      => $event,
            'severity'   => $severity,
            'message'    => $message,
            'context'    => $context,
            'ip'         => request()?->ip(),
            'created_at' => Carbon::now('UTC'),
        ]);
    }

    /** @param array<string, mixed> $context */
    public function device(Device $device, string $event, string $message, array $context = []): DeviceLog
    {
        return DeviceLog::query()->create([
            'device_id'  => $device->getKey(),
            'event'      => $event,
            'message'    => $message,
            'context'    => $context,
            'ip'         => request()?->ip(),
            'created_at' => Carbon::now('UTC'),
        ]);
    }

    public function heartbeat(
        License $license,
        Device $device,
        ?string $appVersion,
        string $licenseStatus,
        int $patchesOffered,
        bool $tokenRefreshed,
        int $durationMs,
    ): HeartbeatLog {
        return HeartbeatLog::query()->create([
            'license_id'      => $license->getKey(),
            'device_id'       => $device->getKey(),
            'app_version'     => $appVersion,
            'license_status'  => $licenseStatus,
            'patches_offered' => $patchesOffered,
            'token_refreshed' => $tokenRefreshed,
            'ip'              => request()?->ip(),
            'duration_ms'     => $durationMs,
            'created_at'      => Carbon::now('UTC'),
        ]);
    }

    /** @param array<string, mixed> $context */
    public function patch(Patch $patch, ?Device $device, string $event, string $message, array $context = []): DeviceLog|LicenseEventLog
    {
        $context['patch_code'] = $patch->patch_code;

        if ($device !== null) {
            return $this->device($device, $event, $message, $context);
        }

        return $this->license(null, $event, $message, $context);
    }

    /** @param array<string, mixed> $context */
    public function security(
        string $type,
        string $message,
        array $context = [],
        string $severity = 'warning',
        ?License $license = null,
        ?Device $device = null,
    ): SecurityEvent {
        return SecurityEvent::query()->create([
            'type'        => $type,
            'severity'    => $severity,
            'license_id'  => $license?->getKey(),
            'device_id'   => $device?->getKey(),
            'fingerprint' => mb_substr((string) ($context['fingerprint'] ?? request()?->header('X-GS-Fingerprint') ?? ''), 0, 64) ?: null,
            'ip'          => request()?->ip(),
            'endpoint'    => mb_substr((string) request()?->path(), 0, 191),
            'message'     => $message,
            'context'     => $context,
            'created_at'  => Carbon::now('UTC'),
        ]);
    }

    /** @param array<string, mixed> $payload */
    public function apiRequest(array $payload): ApiRequestLog
    {
        return ApiRequestLog::query()->create($payload + ['created_at' => Carbon::now('UTC')]);
    }

    public function error(Throwable $e): ErrorLog
    {
        return ErrorLog::query()->create([
            'level'           => 'error',
            'message'         => mb_substr($e->getMessage(), 0, 5000),
            'exception_class' => $e::class,
            'file'            => mb_substr($e->getFile(), 0, 500),
            'line'            => $e->getLine(),
            'context'         => ['trace' => mb_substr($e->getTraceAsString(), 0, 5000)],
            'request_id'      => $this->requestId(),
            'created_at'      => Carbon::now('UTC'),
        ]);
    }

    private function requestId(): ?string
    {
        $id = request()?->attributes->get('request_id');

        return is_string($id) ? $id : null;
    }

    /**
     * حذف مقادیر حساس از لاگ
     *
     * @param array<string, mixed>|null $values
     * @return array<string, mixed>|null
     */
    private function sanitize(?array $values): ?array
    {
        if ($values === null) {
            return null;
        }

        foreach (['password', 'password_confirmation', 'remember_token', 'code_hash', 'token'] as $key) {
            if (array_key_exists($key, $values)) {
                $values[$key] = '***';
            }
        }

        return $values;
    }
}
