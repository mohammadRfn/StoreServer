<?php

declare(strict_types=1);

namespace Modules\Patch\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Modules\Audit\Services\AuditLogger;
use Modules\Patch\Models\Patch;

// چرخه انتشار: draft → scheduled → published → withdrawn
class PatchPublishService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function publish(Patch $patch, ?User $actor = null): Patch
    {
        if ($patch->status === 'withdrawn') {
            throw ValidationException::withMessages(['patch' => 'پچ لغو شده دوباره منتشر نمی‌شود؛ نسخه جدید آپلود کنید.']);
        }

        $patch->forceFill([
            'status'       => 'published',
            'published_at' => Carbon::now('UTC'),
            'scheduled_at' => null,
        ])->save();

        $this->audit->log('patch.publish', 'انتشار پچ', 'Patch', $patch->getKey(), null, ['patch_code' => $patch->patch_code]);

        return $patch;
    }

    public function schedule(Patch $patch, Carbon $at, ?User $actor = null): Patch
    {
        if ($at->isPast()) {
            throw ValidationException::withMessages(['scheduled_at' => 'زمان انتشار باید در آینده باشد.']);
        }

        $patch->forceFill(['status' => 'scheduled', 'scheduled_at' => $at])->save();
        $this->audit->log('patch.schedule', 'زمان‌بندی انتشار پچ', 'Patch', $patch->getKey(), null, [
            'patch_code' => $patch->patch_code, 'scheduled_at' => $at->toIso8601String(),
        ]);

        return $patch;
    }

    public function withdraw(Patch $patch, string $reason, ?User $actor = null): Patch
    {
        $patch->forceFill([
            'status'       => 'withdrawn',
            'withdrawn_at' => Carbon::now('UTC'),
        ])->save();

        $this->audit->log('patch.withdraw', 'لغو انتشار پچ', 'Patch', $patch->getKey(), null, [
            'patch_code' => $patch->patch_code, 'reason' => $reason,
        ]);

        return $patch;
    }

    // انتشار خودکار پچ‌های زمان‌بندی‌شده
    public function publishDue(): int
    {
        $due = Patch::query()
            ->where('status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', Carbon::now('UTC'))
            ->get();

        foreach ($due as $patch) {
            $this->publish($patch);
        }

        return $due->count();
    }
}
