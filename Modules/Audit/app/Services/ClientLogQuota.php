<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use Illuminate\Support\Carbon;
use Modules\Audit\Models\ClientAuditBatch;
use Modules\Audit\Models\ClientLogInboxItem;
use Modules\Audit\Models\SecurityEvent;
use Modules\Base\Services\ServerSettings;
use Modules\License\Models\Device;
use Modules\License\Models\License;

// سقف تعداد لاگ دریافتی در ۲۴ ساعت به ازای هر لایسنس
class ClientLogQuota
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ServerSettings $settings,
    ) {}

    public function exceeded(License $license, ?Device $device, string $batchUuid, int $incoming): bool
    {
        // retry دسته‌ای که قبلاً پذیرفته شده مشمول سقف نیست (idempotent)
        if ($batchUuid !== '' && (
            ClientAuditBatch::query()->where('uuid', $batchUuid)->exists()
            || ClientLogInboxItem::query()->where('batch_uuid', $batchUuid)->exists()
        )) {
            return false;
        }

        $quota = max(100, $this->settings->int('client_logs_daily_quota', 50000));

        $used = (int) ClientAuditBatch::query()
            ->where('license_id', $license->getKey())
            ->where('received_at', '>=', Carbon::now('UTC')->subDay())
            ->sum('log_count');

        // دسته‌های هنوز پردازش‌نشده‌ی inbox هنوز در client_audit_batches نیستند؛ سقف باید «هنگام دریافت» اعمال شود
        // (وگرنه یک مشتری پرحجم قبل از پردازش inbox را پر می‌کند). done ها قبلاً در batches شمرده شده‌اند.
        $used += (int) ClientLogInboxItem::query()
            ->where('license_id', $license->getKey())
            ->where('created_at', '>=', Carbon::now('UTC')->subDay())
            ->where('status', '<>', ClientLogInboxItem::STATUS_DONE)
            ->sum('log_count');

        if ($used + $incoming <= $quota) {
            return false;
        }

        // برای هر لایسنس در هر ۲۴ ساعت فقط یک رویداد
        $recent = SecurityEvent::query()
            ->where('type', 'client_logs_flood')
            ->where('license_id', $license->getKey())
            ->where('created_at', '>=', Carbon::now('UTC')->subDay())
            ->exists();

        if (! $recent) {
            $this->audit->security('client_logs_flood', 'سقف روزانه‌ی لاگ این لایسنس پر شد', [
                'quota'    => $quota,
                'used'     => $used,
                'incoming' => $incoming,
            ], 'warning', $license, $device);
        }

        return true;
    }
}