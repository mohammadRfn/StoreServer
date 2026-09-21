<?php

declare(strict_types=1);

namespace Modules\Customer\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Audit\Services\AuditLogger;
use Modules\Customer\Http\Requests\CustomerRequest;
use Modules\Customer\Models\Customer;

class CustomerController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): InertiaResponse
    {
        $customers = Customer::query()
            ->withCount('licenses')
            ->when($request->string('q')->toString() !== '', function ($query) use ($request): void {
                $term = '%' . $request->string('q')->toString() . '%';
                $query->where(fn ($q) => $q->where('name', 'like', $term)
                    ->orWhere('company', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('email', 'like', $term));
            })
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Customers/Index', [
            'customers' => $customers,
            'filters'   => $request->only('q', 'status'),
        ]);
    }

    public function show(Customer $customer): InertiaResponse
    {
        $customer->load(['licenses.plan:id,code,name', 'licenses.device:id,license_id,fingerprint,app_version']);

        return Inertia::render('Admin/Customers/Show', ['customer' => $customer]);
    }

    public function store(CustomerRequest $request): RedirectResponse
    {
        $customer = Customer::query()->create($request->validated() + ['created_by' => $request->user()?->getKey()]);

        $this->audit->log('customer.create', 'ایجاد مشتری', 'Customer', $customer->getKey(), null, $customer->toArray());

        return back()->with('success', 'مشتری ثبت شد.');
    }

    public function update(CustomerRequest $request, Customer $customer): RedirectResponse
    {
        $old = $customer->toArray();
        $customer->update($request->validated());

        $this->audit->log('customer.update', 'ویرایش مشتری', 'Customer', $customer->getKey(), $old, $customer->toArray());

        return back()->with('success', 'اطلاعات مشتری به‌روزرسانی شد.');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        if ($customer->licenses()->exists()) {
            throw ValidationException::withMessages(['customer' => 'مشتری دارای لایسنس است و قابل حذف نیست.']);
        }

        $this->audit->log('customer.delete', 'حذف مشتری', 'Customer', $customer->getKey(), $customer->toArray());
        $customer->delete();

        return back()->with('success', 'مشتری حذف شد.');
    }
}
