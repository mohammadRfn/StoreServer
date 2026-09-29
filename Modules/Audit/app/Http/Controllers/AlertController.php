<?php

declare(strict_types=1);

namespace Modules\Audit\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Audit\Services\AlertFeed;

class AlertController extends Controller
{
    public function __construct(private readonly AlertFeed $feed) {}

    // POST /panel/alerts/{event}/ack
    public function acknowledge(Request $request, int $event): RedirectResponse
    {
        $this->feed->acknowledge($event, (int) $request->user()->getKey());

        return back();
    }

    // POST /panel/alerts/ack-all
    public function acknowledgeAll(Request $request): RedirectResponse
    {
        $this->feed->acknowledgeAll((int) $request->user()->getKey());

        return back()->with('success', 'همه‌ی هشدارها بررسی‌شده علامت خورد.');
    }
}