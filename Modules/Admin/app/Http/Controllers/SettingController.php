<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Audit\Services\AuditLogger;
use Modules\Base\Models\ServerSetting;
use Modules\Base\Models\SigningKey;
use Modules\Base\Services\ServerSettings;

class SettingController extends Controller
{
    public function __construct(
        private readonly ServerSettings $settings,
        private readonly AuditLogger $audit,
    ) {}

    public function index(): InertiaResponse
    {
        return Inertia::render('Admin/Settings/Index', [
            'settings'    => ServerSetting::query()->orderBy('group')->orderBy('key')->get(),
            'signingKeys' => SigningKey::query()->orderByDesc('id')->get(['id', 'kid', 'algorithm', 'status', 'activated_at', 'retired_at']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'settings'          => ['required', 'array'],
            'settings.*.key'    => ['required', 'string', 'exists:server_settings,key'],
            'settings.*.value'  => ['nullable'],
        ]);

        $old = $this->settings->all();

        foreach ($validated['settings'] as $row) {
            $setting = ServerSetting::query()->where('key', $row['key'])->firstOrFail();
            $this->settings->set($setting->key, $row['value'], $setting->type, $setting->group);
        }

        $this->audit->log('setting.update', 'به‌روزرسانی تنظیمات سرور', 'ServerSetting', null, $old, $this->settings->all());

        return back()->with('success', 'تنظیمات ذخیره شد.');
    }
}
