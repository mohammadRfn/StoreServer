<?php

declare(strict_types=1);

namespace Modules\License\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\License\Models\Device;

class DeviceController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $devices = Device::query()
            ->with(['license:id,uuid,status,plan_id,customer_id', 'license.customer:id,name', 'license.plan:id,code,name'])
            ->when($request->string('q')->toString() !== '', function ($query) use ($request): void {
                $term = '%' . $request->string('q')->toString() . '%';
                $query->where(fn ($q) => $q->where('fingerprint', 'like', $term)
                    ->orWhere('hostname', 'like', $term)
                    ->orWhere('last_ip', 'like', $term));
            })
            ->orderByDesc('last_heartbeat_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Devices/Index', [
            'devices' => $devices,
            'filters' => $request->only('q'),
        ]);
    }

    public function show(Device $device): InertiaResponse
    {
        $device->load(['license.customer', 'license.plan', 'patchStatuses.patch:id,patch_code,title,to_version']);

        return Inertia::render('Admin/Devices/Show', ['device' => $device]);
    }
}