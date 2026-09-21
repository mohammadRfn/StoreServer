<?php

declare(strict_types=1);

namespace Modules\Plan\Services;

use Modules\License\Models\License;
use Modules\Plan\Models\GameshopModule;
use Modules\Plan\Models\Plan;

// محاسبه entitlement نهایی: ماژول‌های هسته + ماژول‌های پلن + override های لایسنس
class EntitlementService
{
    /** @return array<int, string> */
    public function coreModules(): array
    {
        return GameshopModule::query()->core()->orderBy('sort_order')->pluck('key')->all();
    }

    /** @return array<int, string> */
    public function forPlan(Plan $plan): array
    {
        $planModules = $plan->modules()
            ->wherePivot('enabled', true)
            ->where('gameshop_modules.is_active', true)
            ->orderBy('gameshop_modules.sort_order')
            ->pluck('gameshop_modules.key')
            ->all();

        return array_values(array_unique([...$this->coreModules(), ...$planModules]));
    }

    /** @return array<int, string> */
    public function forLicense(License $license): array
    {
        $license->loadMissing(['plan', 'moduleOverrides.module']);

        $entitlements = $license->plan !== null ? $this->forPlan($license->plan) : $this->coreModules();
        $entitlements = array_flip($entitlements);

        foreach ($license->moduleOverrides as $override) {
            $key = $override->module?->key;

            if ($key === null) {
                continue;
            }

            if ($override->enabled) {
                $entitlements[$key] = true;
            } else {
                unset($entitlements[$key]);
            }
        }

        // ماژول‌های هسته همیشه روشن‌اند حتی با override خاموش
        foreach ($this->coreModules() as $core) {
            $entitlements[$core] = true;
        }

        return array_values(array_keys($entitlements));
    }

    /** @return array<string, int|null> */
    public function limitsForLicense(License $license): array
    {
        $license->loadMissing('plan.limits');

        $limits = [];
        foreach ($license->plan?->limits ?? [] as $limit) {
            $limits[$limit->limit_key] = $limit->limit_value;
        }

        return $limits;
    }
}
