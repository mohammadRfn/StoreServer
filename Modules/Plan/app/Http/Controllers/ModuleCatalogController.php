<?php

declare(strict_types=1);

namespace Modules\Plan\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Audit\Services\AuditLogger;
use Modules\Plan\Models\GameshopModule;

// مدیریت کاتالوگ ماژول‌های GameShop
class ModuleCatalogController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(): InertiaResponse
    {
        return Inertia::render('Admin/Modules/Index', [
            'modules' => GameshopModule::query()->orderBy('sort_order')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'key'         => ['required', 'string', 'max:64', 'regex:/^[A-Za-z][A-Za-z0-9]*$/', 'unique:gameshop_modules,key'],
            'title'       => ['required', 'string', 'max:128'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_core'     => ['sometimes', 'boolean'],
            'sort_order'  => ['sometimes', 'integer', 'min:0'],
        ]);

        $module = GameshopModule::query()->create($data);
        $this->audit->log('module.create', 'افزودن ماژول به کاتالوگ', 'GameshopModule', $module->getKey(), null, $module->toArray());

        return back()->with('success', 'ماژول اضافه شد.');
    }

    public function update(Request $request, GameshopModule $module): RedirectResponse
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:128'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active'   => ['sometimes', 'boolean'],
            'sort_order'  => ['sometimes', 'integer', 'min:0'],
        ]);

        $old = $module->toArray();
        $module->update($data);
        $this->audit->log('module.update', 'ویرایش ماژول کاتالوگ', 'GameshopModule', $module->getKey(), $old, $module->toArray());

        return back()->with('success', 'ماژول به‌روزرسانی شد.');
    }
}
