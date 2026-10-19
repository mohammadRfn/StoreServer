<?php

declare(strict_types=1);

namespace Modules\Audit\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Audit\Models\ClientLogInboxItem;
use Modules\Audit\Services\AuditLogger;
use Modules\Audit\Services\ClientLogInbox;
use Modules\Audit\Services\ClientLogInboxHealth;

// پنل: وضعیت صف ورودی لاگ اپ‌ها + retry دستی (فقط با log.view؛ مسیرها در routes/web.php)
class InboxController extends Controller
{
    public function __construct(
        private readonly ClientLogInbox $inbox,
        private readonly ClientLogInboxHealth $health,
        private readonly AuditLogger $audit,
    ) {}

    // GET /panel/logs/inbox
    public function index(Request $request): InertiaResponse
    {
        $status = $request->string('status')->toString();
        $allowed = [
            ClientLogInboxItem::STATUS_PENDING, ClientLogInboxItem::STATUS_PROCESSING, ClientLogInboxItem::STATUS_DONE,
            ClientLogInboxItem::STATUS_FAILED, ClientLogInboxItem::STATUS_DEAD,
        ];

        $items = ClientLogInboxItem::query()
            ->select(ClientLogInboxItem::LIST_COLUMNS) // بدون payload
            ->with(['license:id,uuid', 'device:id,hostname'])
            ->when(in_array($status, $allowed, true), fn ($q) => $q->where('status', $status))
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Logs/Inbox', [
            'stats'   => $this->health->stats($this->inbox->mode()),
            'items'   => $items,
            'filters' => ['status' => in_array($status, $allowed, true) ? $status : ''],
        ]);
    }

    // POST /panel/logs/inbox/{item}/retry
    public function retry(ClientLogInboxItem $item): RedirectResponse
    {
        $ok = $this->inbox->retry($item);

        if ($ok) {
            $this->audit->log('client_logs.inbox.retry', 'retry دستی یک دسته‌ی لاگ از inbox', 'client_log_inbox', (int) $item->getKey());
        }

        return back()->with($ok ? 'success' : 'error', $ok
            ? 'دسته دوباره در صف پردازش قرار گرفت.'
            : 'این دسته قابل retry نیست (وضعیت یا payload).');
    }

    // POST /panel/logs/inbox/retry-dead
    public function retryDead(): RedirectResponse
    {
        $count = $this->inbox->retryAllDead();

        if ($count > 0) {
            $this->audit->log('client_logs.inbox.retry_all_dead', "retry دستی {$count} دسته‌ی dead از inbox");
        }

        return back()->with('success', "{$count} دسته‌ی dead دوباره در صف پردازش قرار گرفت.");
    }
}