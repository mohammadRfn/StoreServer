<?php

declare(strict_types=1);

namespace Modules\License\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Customer\Models\Customer;
use Modules\License\Http\Requests\IssueLicenseRequest;
use Modules\License\Models\License;
use Modules\License\Services\LicenseService;
use Modules\Plan\Models\GameshopModule;
use Modules\Plan\Models\Plan;
use Modules\Plan\Services\EntitlementService;

class LicenseController extends Controller
{
    public function __construct(
        private readonly LicenseService $licenses,
        private readonly EntitlementService $entitlements,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $licenses = License::query()
            ->with(['customer:id,uuid,name', 'plan:id,code,name', 'device:id,license_id,fingerprint,app_version,last_heartbeat_at'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('plan_id'), fn ($q) => $q->where('plan_id', $request->integer('plan_id')))
            ->when($request->string('q')->toString() !== '', function ($query) use ($request): void {
                $term = '%' . $request->string('q')->toString() . '%';
                $query->where(fn ($q) => $q->where('uuid', 'like', $term)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', $term))
                    ->orWhereHas('device', fn ($d) => $d->where('fingerprint', 'like', $term)));
            })
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Licenses/Index', [
            'licenses' => $licenses,
            'plans'    => Plan::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'default_duration']),
            'customers' => Customer::query()->orderBy('name')->limit(200)->get(['id', 'name']),
            'filters'  => $request->only('q', 'status', 'plan_id'),
        ]);
    }

    public function show(License $license): InertiaResponse
    {
        $license->load([
            'customer', 'plan.modules:id,key,title', 'device',
            'moduleOverrides.module:id,key,title',
            'history.fromPlan:id,code', 'history.toPlan:id,code', 'history.performer:id,name',
        ]);

        return Inertia::render('Admin/Licenses/Show', [
            'license'      => $license,
            'entitlements' => $this->entitlements->forLicense($license),
            'modules'      => GameshopModule::query()->orderBy('sort_order')->get(['id', 'key', 'title', 'is_core']),
        ]);
    }

    public function store(IssueLicenseRequest $request): RedirectResponse
    {
        $this->licenses->issue(
            $request->integer('customer_id'),
            $request->integer('plan_id'),
            $request->string('duration_type')->toString(),
            $request->user(),
            $request->input('note'),
        );

        return back()->with('success', 'لایسنس صادر شد.');
    }

    public function renew(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate([
            'duration_type' => ['required', 'in:monthly,yearly,permanent'],
            'note'          => ['nullable', 'string', 'max:500'],
        ]);

        $this->licenses->renew($license, $data['duration_type'], $request->user(), $data['note'] ?? null);

        return back()->with('success', 'لایسنس تمدید شد.');
    }

    public function changePlan(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'note'    => ['nullable', 'string', 'max:500'],
        ]);

        $this->licenses->changePlan($license, Plan::query()->findOrFail($data['plan_id']), $request->user(), $data['note'] ?? null);

        return back()->with('success', 'پلن لایسنس تغییر کرد.');
    }

    public function suspend(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $this->licenses->suspend($license, $data['reason'], $request->user());

        return back()->with('success', 'لایسنس غیرفعال شد؛ نرم‌افزار از اولین heartbeat بعدی قفل می‌شود.');
    }

    public function reactivate(Request $request, License $license): RedirectResponse
    {
        $this->licenses->reactivate($license, $request->user());

        return back()->with('success', 'لایسنس دوباره فعال شد.');
    }

    public function revoke(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $this->licenses->revoke($license, $data['reason'], $request->user());

        return back()->with('success', 'لایسنس باطل شد.');
    }

    public function override(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate([
            'module_id' => ['required', 'integer', 'exists:gameshop_modules,id'],
            'enabled'   => ['required', 'boolean'],
            'reason'    => ['nullable', 'string', 'max:255'],
        ]);

        $this->licenses->setModuleOverride(
            $license,
            (int) $data['module_id'],
            (bool) $data['enabled'],
            $data['reason'] ?? null,
            $request->user(),
        );

        return back()->with('success', 'استثنای ماژول ثبت شد.');
    }
}