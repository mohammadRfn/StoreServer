<?php

declare(strict_types=1);

namespace Modules\Audit\Http\Controllers;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Modules\Audit\Models\ApiRequestLog;
use Modules\Audit\Models\AuditLog;
use Modules\Audit\Models\DeviceLog;
use Modules\Audit\Models\ErrorLog;
use Modules\Audit\Models\HeartbeatLog;
use Modules\Audit\Models\LicenseEventLog;
use Modules\Audit\Models\SecurityEvent;
use Modules\Patch\Models\PatchDownload;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LogController extends Controller
{
    /** @var array<string, class-string<Model>> */
    private array $categories = [
        'audit'     => AuditLog::class,
        'license'   => LicenseEventLog::class,
        'heartbeat' => HeartbeatLog::class,
        'device'    => DeviceLog::class,
        'security'  => SecurityEvent::class,
        'api'       => ApiRequestLog::class,
        'error'     => ErrorLog::class,
        'patch'     => PatchDownload::class,
    ];

    public function index(Request $request): InertiaResponse
    {
        $category = $request->string('category')->toString() ?: 'audit';
        $logs = $this->query($category, $request)->paginate(30)->withQueryString();

        return Inertia::render('Admin/Logs/Index', [
            'category'   => $category,
            'categories' => array_keys($this->categories),
            'logs'       => $logs,
            'filters'    => $request->only('q', 'from', 'to', 'category'),
        ]);
    }

    // خروجی CSV برای دسته انتخاب‌شده
    public function export(Request $request): StreamedResponse
    {
        $category = $request->string('category')->toString() ?: 'audit';
        $query = $this->query($category, $request)->limit(50000);

        $fileName = "storeserver-logs-{$category}-" . now()->utc()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($query): void {
            $handle = fopen('php://output', 'w');
            $first = true;

            foreach ($query->cursor() as $row) {
                /** @var array<string, mixed> $data */
                $data = $row->toArray();

                if ($first) {
                    fputcsv($handle, array_keys($data));
                    $first = false;
                }

                fputcsv($handle, array_map(
                    static fn ($value) => is_scalar($value) || $value === null ? $value : json_encode($value, JSON_UNESCAPED_UNICODE),
                    $data,
                ));
            }

            fclose($handle);
        }, $fileName, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function query(string $category, Request $request): Builder
    {
        $model = $this->categories[$category] ?? AuditLog::class;

        /** @var Builder $query */
        $query = $model::query();

        $query->when($request->filled('from'), fn (Builder $q) => $q->where('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $q) => $q->where('created_at', '<=', $request->date('to')))
            ->orderByDesc('id');

        $term = $request->string('q')->toString();

        if ($term !== '') {
            $like = '%' . $term . '%';
            $searchable = match ($category) {
                'audit'     => ['action', 'description', 'entity_type', 'user_name', 'ip'],
                'license'   => ['event', 'message', 'ip'],
                'heartbeat' => ['app_version', 'license_status', 'ip'],
                'device'    => ['event', 'message', 'ip'],
                'security'  => ['type', 'message', 'fingerprint', 'ip', 'endpoint'],
                'api'       => ['path', 'method', 'error_code', 'fingerprint', 'ip'],
                'error'     => ['message', 'exception_class', 'file'],
                default     => ['ip', 'status'],
            };

            $query->where(function (Builder $q) use ($searchable, $like): void {
                foreach ($searchable as $column) {
                    $q->orWhere($column, 'like', $like);
                }
            });
        }

        return $query;
    }
}
