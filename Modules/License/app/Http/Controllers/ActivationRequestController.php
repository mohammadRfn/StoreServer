<?php

declare(strict_types=1);

namespace Modules\License\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Customer\Models\Customer;
use Modules\License\Http\Requests\ApproveActivationRequest;
use Modules\License\Models\ActivationRequest;
use Modules\License\Services\ActivationService;
use Modules\Plan\Models\Plan;

class ActivationRequestController extends Controller
{
    public function __construct(private readonly ActivationService $activation) {}

    public function index(Request $request): InertiaResponse
    {
        $requests = ActivationRequest::query()
            ->with(['license:id,uuid', 'reviewer:id,name'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/ActivationRequests/Index', [
            'requests'  => $requests,
            'plans'     => Plan::query()->orderBy('sort_order')->get(['id', 'code', 'name', 'default_duration']),
            'customers' => Customer::query()->orderBy('name')->limit(200)->get(['id', 'name']),
            'filters'   => $request->only('status'),
        ]);
    }

    public function approve(ApproveActivationRequest $request, ActivationRequest $activationRequest): RedirectResponse
    {
        $license = $this->activation->approve(
            $activationRequest,
            Customer::query()->findOrFail($request->integer('customer_id')),
            $request->integer('plan_id'),
            $request->string('duration_type')->toString(),
            $request->user(),
        );

        return back()->with('success', "درخواست تأیید شد و لایسنس {$license->uuid} صادر گردید.");
    }

    public function reject(Request $request, ActivationRequest $activationRequest): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $this->activation->reject($activationRequest, $data['reason'], $request->user());

        return back()->with('success', 'درخواست رد شد.');
    }
}
