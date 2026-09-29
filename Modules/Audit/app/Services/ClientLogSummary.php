<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Modules\Audit\Models\ClientAuditLog;

// خلاصه‌ی لاگ‌های دریافتی از اپ برای نمایش در صفحه‌ی لایسنس/دستگاه
class ClientLogSummary
{
    private const ERROR_LEVELS = ['error', 'critical', 'alert', 'emergency'];

    /** @return array<string, mixed> */
    public function forLicense(int $licenseId): array
    {
        return $this->summarize('license_id', $licenseId);
    }

    /** @return array<string, mixed> */
    public function forDevice(int $deviceId): array
    {
        return $this->summarize('device_id', $deviceId);
    }

    /** @return array<string, mixed> */
    private function summarize(string $column, int $id): array
    {
        $since = Carbon::now('UTC')->subDay();

        $base = static fn (): \Illuminate\Database\Eloquent\Builder => ClientAuditLog::query()->where($column, $id);

        // «خطا» = رکوردهای کانال error؛ هم‌راستا با تب «خطاهای اپ» در پنل
        $isError = static fn (Builder $q): Builder => $q->where('channel', 'error');

        $last = $base()->latest('id')->first(['id', 'created_at']);

        $chain = \Modules\Audit\Models\ClientChainState::query()
            ->where($column === 'device_id' ? 'device_id' : 'license_id', $id)
            ->orderByRaw("FIELD(status, 'broken', 'gap', 'ok')")
            ->first(['status', 'reason', 'broken_sequence', 'missing_from']);

        return [
            'last_received_at' => $last?->created_at?->toIso8601String(),
            'chain'            => $chain?->only(['status', 'reason', 'broken_sequence', 'missing_from']),
            'errors_24h'       => $base()->where('created_at', '>=', $since)->where($isError)->count(),
            'security_24h'     => $base()->where('created_at', '>=', $since)->where('channel', 'security')->count(),
            'recent'           => $base()
                ->whereIn('channel', ['error', 'security'])
                ->latest('id')
                ->limit(8)
                ->get(['id', 'level', 'channel', 'action', 'description', 'occurred_at', 'created_at']),
        ];
    }
}