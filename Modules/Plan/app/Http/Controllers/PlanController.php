<?php

declare(strict_types=1);

namespace Modules\Plan\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Audit\Services\AuditLogger;
use Modules\Plan\Http\Requests\PlanRequest;
use Modules\Plan\Models\GameshopModule;
use Modules\Plan\Models\Plan;
use Modules\Plan\Models\PlanLimit;
use Modules\Plan\Services\EntitlementService;

class PlanController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly EntitlementService $entitlements,
    ) {}

    public function index(): InertiaResponse
    {
        return Inertia::render('Admin/Plans/Index', [
            'plans'   => Plan::query()->with(['modules:id,key,title', 'limits'])->withCount('licenses')->orderBy('sort_order')->get(),
            'modules' => GameshopModule::query()->orderBy('sort_order')->get(),
        ]);
    }

    public function show(Plan $plan): InertiaResponse
    {
        $plan->load(['modules', 'limits']);

        return Inertia::render('Admin/Plans/Show', [
            'plan'         => $plan,
            'entitlements' => $this->entitlements->forPlan($plan),
        ]);
    }

    public function store(PlanRequest $request): RedirectResponse
    {
        $plan = DB::transaction(function () use ($request): Plan {
            $plan = Plan::query()->create($request->safe()->except('modules', 'limits') + [
                'created_by' => $request->user()?->getKey(),
            ]);

            $this->syncModules($plan, (array) $request->input('modules', []));
            $this->syncLimits($plan, (array) $request->input('limits', []));

            return $plan;
        });

        $this->audit->log('plan.create', 'ایجاد پلن', 'Plan', $plan->getKey(), null, $plan->toArray());

        return back()->with('success', 'پلن ایجاد شد.');
    }

    public function update(PlanRequest $request, Plan $plan): RedirectResponse
    {
        $old = $plan->load(['modules:id,key', 'limits'])->toArray();

        DB::transaction(function () use ($request, $plan): void {
            $plan->update($request->safe()->except('modules', 'limits'));
            $this->syncModules($plan, (array) $request->input('modules', []));
            $this->syncLimits($plan, (array) $request->input('limits', []));
        });

        $this->audit->log('plan.update', 'ویرایش پلن', 'Plan', $plan->getKey(), $old, $plan->fresh(['modules:id,key', 'limits'])?->toArray());

        return back()->with('success', 'پلن به‌روزرسانی شد.');
    }

    public function destroy(Plan $plan): RedirectResponse
    {
        if ($plan->licenses()->exists()) {
            throw ValidationException::withMessages(['plan' => 'این پلن دارای لایسنس فعال است و قابل حذف نیست.']);
        }

        $this->audit->log('plan.delete', 'حذف پلن', 'Plan', $plan->getKey(), $plan->toArray());
        $plan->delete();

        return back()->with('success', 'پلن حذف شد.');
    }

    /** @param array<int, int> $moduleIds */
    private function syncModules(Plan $plan, array $moduleIds): void
    {
        $payload = [];
        foreach (array_unique(array_map('intval', $moduleIds)) as $id) {
            $payload[$id] = ['enabled' => true];
        }

        $plan->modules()->sync($payload);
    }

    /** @param array<int, array{key: string, value: int|null}> $limits */
    private function syncLimits(Plan $plan, array $limits): void
    {
        $keys = [];

        foreach ($limits as $limit) {
            if (! isset($limit['key'])) {
                continue;
            }

            $keys[] = $limit['key'];
            PlanLimit::query()->updateOrCreate(
                ['plan_id' => $plan->getKey(), 'limit_key' => $limit['key']],
                ['limit_value' => $limit['value'] ?? null],
            );
        }

        PlanLimit::query()->where('plan_id', $plan->getKey())->whereNotIn('limit_key', $keys ?: ['__none__'])->delete();
    }
}
