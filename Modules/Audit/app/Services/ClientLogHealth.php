<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Support\Carbon;
use Modules\Audit\Models\SecurityEvent;
use Modules\Base\Services\ServerSettings;
use Modules\License\Models\Device;
use Modules\License\Models\License;

// وضعیت صف ارسال لاگ اپ که با heartbeat می‌رسد
class ClientLogHealth
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ServerSettings $settings,
        private readonly AlertFeed $alerts,
    ) {}

    /** @param array<string, mixed> $stats */
    public function record(License $license, Device $device, array $stats): void
    {
        $health = [
            'pending'        => (int) ($stats['pending'] ?? 0),
            'failed'         => (int) ($stats['failed'] ?? 0),
            'dead'           => (int) ($stats['dead'] ?? 0),
            'oldest_pending' => $stats['oldest_pending'] ?? null,
            'last_sequence'  => (int) ($stats['last_sequence'] ?? 0),
            'reported_at'    => Carbon::now('UTC')->toIso8601String(),
        ];

        $device->forceFill(['log_health' => $health])->saveQuietly();

        $this->flagIfStuck($license, $device, $health);
    }

    /** @param array<string, mixed> $health */
    private function flagIfStuck(License $license, Device $device, array $health): void
    {
        $stuckHours = max(1, $this->settings->int('client_logs_stuck_after_hours', 24));
        $oldest = $health['oldest_pending'] !== null ? Carbon::parse($health['oldest_pending']) : null;

        $stuck = $health['dead'] > 0
            || ($oldest !== null && $oldest->lt(Carbon::now('UTC')->subHours($stuckHours)));

        if (! $stuck) {
            $this->alerts->resolve((int) $device->getKey(), ['client_logs_stuck']);

            return;
        }

        // برای هر دستگاه در هر ۲۴ ساعت فقط یک رویداد
        $recent = SecurityEvent::query()
            ->where('type', 'client_logs_stuck')
            ->where('device_id', $device->getKey())
            ->where('created_at', '>=', Carbon::now('UTC')->subDay())
            ->exists();

        if ($recent) {
            return;
        }

        $this->audit->security('client_logs_stuck', 'صف ارسال لاگ اپ گیر کرده است', [
            'pending'        => $health['pending'],
            'failed'         => $health['failed'],
            'dead'           => $health['dead'],
            'oldest_pending' => $health['oldest_pending'],
        ], 'warning', $license, $device);
    }
}