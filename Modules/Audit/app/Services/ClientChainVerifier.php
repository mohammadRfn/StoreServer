<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Support\Carbon;
use Modules\Audit\Models\ClientAuditLog;
use Modules\Audit\Models\ClientChainState;
use Modules\Base\Services\ServerSettings;
use Modules\License\Models\Device;
use Modules\License\Models\License;

// بررسی پیوستگی زنجیره‌ی هش لاگ‌های هر دستگاه (sequence پیوسته + previous_hash = hash قبلی)
class ClientChainVerifier
{
    private const CHUNK = 5000;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ServerSettings $settings,
        private readonly AlertFeed $alerts,
    ) {}

    public function verifyDevice(int $deviceId): ClientChainState
    {
        $state = ClientChainState::query()->find($deviceId) ?? new ClientChainState([
            'device_id'  => $deviceId,
            'license_id' => (int) ClientAuditLog::query()->where('device_id', $deviceId)->value('license_id'),
        ]);

        // broken چسبنده است؛ فقط با --reset ادمین پاک می‌شود
        if ($state->status === 'broken') {
            return $state;
        }

        $now = Carbon::now('UTC');

        // ۱) تشخیص fork: رکورد تازه‌رسیده با sequenceی که قبلاً پوشش داده شده یا تکراری در همین دسته
        do {
            $new = ClientAuditLog::query()
                ->where('device_id', $deviceId)
                ->where('id', '>', (int) $state->last_checked_id)
                ->orderBy('id')
                ->limit(self::CHUNK)
                ->get(['id', 'sequence']);

            if ($new->isEmpty()) {
                break;
            }

            $state->last_checked_id = (int) $new->max('id');
            $sequences = $new->pluck('sequence')->filter(fn ($s) => $s !== null)->map(fn ($s) => (int) $s);

            $forked = $sequences->first(fn (int $s) => $s <= (int) $state->anchor_sequence)
                ?? $sequences->duplicates()->first();

            if ($forked !== null) {
                return $this->markBroken($state, 'fork', (int) $forked, $now);
            }
        } while ($new->count() === self::CHUNK);

        // ۲) جلو بردن لنگر روی رکوردهای پیوسته
        $gap = null;

        while (true) {
            $rows = ClientAuditLog::query()
                ->where('device_id', $deviceId)
                ->whereNotNull('sequence')
                ->where('sequence', '>', (int) $state->anchor_sequence)
                ->orderBy('sequence')
                ->orderBy('id')
                ->limit(self::CHUNK)
                ->get(['id', 'sequence', 'hash', 'previous_hash']);

            if ($rows->isEmpty()) {
                break;
            }

            foreach ($rows as $row) {
                $expected = (int) $state->anchor_sequence + 1;
                $sequence = (int) $row->sequence;

                if ($sequence === $expected) {
                    if (($row->previous_hash ?: null) !== ($state->anchor_hash ?: null)) {
                        return $this->markBroken($state, 'link_mismatch', $sequence, $now);
                    }

                    $state->anchor_sequence = $sequence;
                    $state->anchor_hash = $row->hash;
                } elseif ($sequence > $expected) {
                    $gap = $expected;

                    break 2;
                } else {
                    return $this->markBroken($state, 'fork', $sequence, $now);
                }
            }
        }

        $this->applyGap($state, $gap, $now);
        $state->verified_at = $now;
        $state->save();

        return $state;
    }

    public function reset(int $deviceId): void
    {
        ClientChainState::query()->whereKey($deviceId)->delete();
        $this->alerts->resolve($deviceId, ['chain_broken', 'chain_gap']);
    }

    private function applyGap(ClientChainState $state, ?int $missingFrom, Carbon $now): void
    {
        if ($missingFrom === null) {
            $wasGap = $state->status === 'gap';

            $state->fill(['status' => 'ok', 'reason' => null, 'missing_from' => null, 'gap_since' => null, 'alerted_at' => null]);

            if ($wasGap) {
                $this->alerts->resolve((int) $state->device_id, ['chain_gap']);
            }

            return;
        }

        $state->missing_from = $missingFrom;
        $state->gap_since ??= $now;

        $graceHours = max(1, $this->settings->int('client_chain_gap_grace_hours', 48));

        if ($state->gap_since->copy()->addHours($graceHours)->isFuture()) {
            return; // هنوز در مهلت؛ ممکن است در صف retry اپ باشد
        }

        $state->status = 'gap';
        $state->reason = 'sequence_gap';

        if ($state->alerted_at === null) {
            $state->alerted_at = $now;
            $this->raise('chain_gap', 'warning', 'رکورد(های) گمشده در زنجیره‌ی لاگ اپ', $state, ['missing_from' => $missingFrom]);
        }
    }

    private function markBroken(ClientChainState $state, string $reason, int $sequence, Carbon $now): ClientChainState
    {
        $state->fill(['status' => 'broken', 'reason' => $reason, 'broken_sequence' => $sequence, 'verified_at' => $now, 'alerted_at' => $now]);
        $state->save();

        $this->raise('chain_broken', 'critical', 'زنجیره‌ی هش لاگ اپ شکسته شد (دستکاری، بازسازی یا restore دیتابیس اپ)', $state, ['reason' => $reason, 'sequence' => $sequence]);

        return $state;
    }

    /** @param array<string, mixed> $context */
    private function raise(string $type, string $severity, string $message, ClientChainState $state, array $context): void
    {
        $this->audit->security(
            $type,
            $message,
            $context + ['device_id' => (int) $state->device_id, 'anchor_sequence' => (int) $state->anchor_sequence],
            $severity,
            License::query()->find($state->license_id),
            Device::query()->find($state->device_id),
        );
    }
}