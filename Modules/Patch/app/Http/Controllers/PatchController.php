<?php

declare(strict_types=1);

namespace Modules\Patch\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\License\Models\License;
use Modules\Patch\Http\Requests\UploadPatchRequest;
use Modules\Patch\Models\Patch;
use Modules\Patch\Services\PatchPublishService;
use Modules\Patch\Services\PatchUploadService;
use Modules\Plan\Models\Plan;

class PatchController extends Controller
{
    public function __construct(
        private readonly PatchUploadService $uploader,
        private readonly PatchPublishService $publisher,
    ) {}

    public function index(Request $request): InertiaResponse
    {
        $patches = Patch::query()
            ->withCount(['deviceStatuses', 'downloads'])
            ->with(['uploader:id,name', 'targetPlans:id,code,name'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->string('q')->toString() !== '', function ($query) use ($request): void {
                $term = '%' . $request->string('q')->toString() . '%';
                $query->where(fn ($q) => $q->where('patch_code', 'like', $term)->orWhere('title', 'like', $term));
            })
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Patches/Index', [
            'patches'  => $patches,
            'plans'    => Plan::query()->orderBy('sort_order')->get(['id', 'code', 'name']),
            'licenses' => License::query()->active()->limit(200)->get(['id', 'uuid']),
            'filters'  => $request->only('q', 'status'),
        ]);
    }

    public function show(Patch $patch): InertiaResponse
    {
        $patch->load([
            'files', 'scripts', 'dependencies:id,patch_code,title',
            'targetPlans:id,code,name', 'targetLicenses:id,uuid',
            'deviceStatuses.device:id,fingerprint,hostname,app_version',
        ]);

        return Inertia::render('Admin/Patches/Show', ['patch' => $patch]);
    }

    public function store(UploadPatchRequest $request): RedirectResponse
    {
        $patch = $this->uploader->upload(
            $request->file('file'),
            [
                'target_type'  => $request->string('target_type')->toString(),
                'is_mandatory' => $request->boolean('is_mandatory'),
                'plans'        => (array) $request->input('plans', []),
                'licenses'     => (array) $request->input('licenses', []),
                'depends_on'   => (array) $request->input('depends_on', []),
            ],
            $request->user(),
        );

        return back()->with('success', "پچ {$patch->patch_code} آپلود و امضا شد و در وضعیت پیش‌نویس است.");
    }

    public function publish(Request $request, Patch $patch): RedirectResponse
    {
        $this->publisher->publish($patch, $request->user());

        return back()->with('success', 'پچ منتشر شد.');
    }

    public function schedule(Request $request, Patch $patch): RedirectResponse
    {
        $data = $request->validate(['scheduled_at' => ['required', 'date']]);
        $this->publisher->schedule($patch, Carbon::parse($data['scheduled_at'])->utc(), $request->user());

        return back()->with('success', 'زمان انتشار ثبت شد.');
    }

    public function withdraw(Request $request, Patch $patch): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $this->publisher->withdraw($patch, $data['reason'], $request->user());

        return back()->with('success', 'انتشار پچ لغو شد.');
    }
}
