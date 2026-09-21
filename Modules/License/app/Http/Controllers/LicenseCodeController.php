<?php

declare(strict_types=1);

namespace Modules\License\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Customer\Models\Customer;
use Modules\License\Models\LicenseCode;
use Modules\License\Services\LicenseCodeService;
use Modules\Plan\Models\Plan;

class LicenseCodeController extends Controller
{
    public function __construct(private readonly LicenseCodeService $codes) {}

    public function index(Request $request): InertiaResponse
    {
        $codes = LicenseCode::query()
            ->with(['plan:id,code,name', 'customer:id,name', 'license:id,uuid', 'creator:id,name'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/LicenseCodes/Index', [
            'codes'     => $codes,
            'plans'     => Plan::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'default_duration']),
            'customers' => Customer::query()->orderBy('name')->limit(200)->get(['id', 'name']),
            'filters'   => $request->only('status'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'plan_id'       => ['required', 'integer', 'exists:plans,id'],
            'duration_type' => ['required', 'in:monthly,yearly,permanent'],
            'customer_id'   => ['nullable', 'integer', 'exists:customers,id'],
            'ttl_days'      => ['nullable', 'integer', 'min:1', 'max:3650'],
            'count'         => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $plainCodes = [];

        for ($i = 0; $i < (int) ($data['count'] ?? 1); $i++) {
            $result = $this->codes->generate(
                (int) $data['plan_id'],
                $data['duration_type'],
                $data['customer_id'] ?? null,
                $data['ttl_days'] ?? (int) config('licensing.codes.default_ttl_days'),
                $request->user(),
            );

            $plainCodes[] = $result['plain_code'];
        }

        // کدها فقط همین یک‌بار در flash نمایش داده می‌شوند
        return back()->with('success', 'کد(های) یک‌بارمصرف ساخته شد.')->with('plain_codes', $plainCodes);
    }

    public function revoke(Request $request, LicenseCode $code): RedirectResponse
    {
        $this->codes->revoke($code, $request->user());

        return back()->with('success', 'کد باطل شد.');
    }
}
