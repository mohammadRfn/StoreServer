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
            ->with(['license:id,uuid', 'issuedCode:id,code_prefix,status', 'reviewer:id,name'])
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
        $customerId = $request->integer('customer_id');

        $result = $this->activation->approveWithCode(
            $activationRequest,
            $customerId ? Customer::query()->findOrFail($customerId) : null,
            $request->integer('plan_id'),
            $request->string('duration_type')->toString(),
            $request->integer('ttl_days') ?: null,
            $request->user(),
        );

        // کد خام فقط همین یک‌بار در flash نمایش داده می‌شود تا ادمین آن را به مشتری تحویل دهد
        return back()
            ->with('success', 'درخواست تأیید شد؛ کد یک‌بارمصرف صادر گردید.')
            ->with('plain_codes', [$result['plain_code']]);
    }

    public function reject(Request $request, ActivationRequest $activationRequest): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $this->activation->reject($activationRequest, $data['reason'], $request->user());

        return back()->with('success', 'درخواست رد شد.');
    }
}