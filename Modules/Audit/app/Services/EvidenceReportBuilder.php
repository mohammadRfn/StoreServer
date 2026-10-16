<?php

declare(strict_types=1);

namespace Modules\Audit\Services;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Modules\Audit\Models\ApiRequestLog;
use Modules\Audit\Models\AuditLog;
use Modules\Audit\Models\ClientAuditLog;
use Modules\Audit\Models\ClientChainState;
use Modules\Audit\Models\HeartbeatLog;
use Modules\Audit\Models\LicenseEventLog;
use Modules\Audit\Models\SecurityEvent;
use Modules\License\Models\ActivationRequest;
use Modules\License\Models\Device;
use Modules\License\Models\License;

/**
 * ساخت «گزارش مدرک» (Evidence Report) برای یک لایسنس.
 *
 * خروجی یک آرایه‌ی کاملاً داده‌محور است (بدون هیچ رندر)؛ ذخیره، هش و ارائه‌ی آن
 * کار EvidenceRepository است. همه‌ی زمان‌ها UTC و با فرمت ISO-8601 هستند تا
 * هنگام استعلام از ISP/پلیس فتا ابهام منطقه‌ی زمانی پیش نیاید.
 */
class EvidenceReportBuilder
{
    private const SCHEMA_VERSION = 1;

    private const CAP_HEARTBEATS = 300;
    private const CAP_API        = 300;
    private const CAP_EVENTS     = 1000;
    private const CAP_CLIENT     = 300;

    /**
     * @param  array{title?: string, reference?: string|null, notes?: string|null}  $case
     * @return array<string, mixed>
     */
    public function build(License $license, ?User $by, string $reportId, array $case): array
    {
        $license->loadMissing(['customer', 'plan', 'device', 'issuer', 'history.fromPlan', 'history.toPlan', 'history.performer']);

        $device = $license->device;
        $now    = Carbon::now('UTC');

        $activations = $this->activations($license, $device);
        $ips         = $this->ipStats($license, $device, $activations);
        $heartbeats  = $this->heartbeats($license);
        $api         = $this->apiRequests($license, $device);
        $security    = $this->securityEvents($license, $device);
        $events      = $this->licenseEvents($license);
        $history     = $this->planHistory($license);
        $admin       = $this->adminActions($license);
        $clientLogs  = $this->clientLogs($license, $device);
        $timeline    = $this->timeline($events, $security['rows'], $history, $activations, $admin);

        $publicIps = array_values(array_filter($ips, static fn (array $r): bool => $r['is_public']));

        return [
            'meta' => [
                'schema_version' => self::SCHEMA_VERSION,
                'report_id'      => $reportId,
                'generated_at'   => $this->iso($now),
                'generated_by'   => $by ? ['id' => $by->getKey(), 'name' => $by->name, 'email' => $by->email] : null,
                'system'         => ['app' => (string) config('app.name'), 'timezone' => 'UTC'],
                'case'           => [
                    'title'     => (string) ($case['title'] ?? ''),
                    'reference' => $case['reference'] ?? null,
                    'notes'     => $case['notes'] ?? null,
                ],
                'notes' => [
                    'همه‌ی زمان‌ها به وقت UTC (جهانی) ثبت شده‌اند؛ برای تبدیل به وقت تهران ۳:۳۰ ساعت (و در دوره‌ی ساعت تابستانی ۴:۳۰) اضافه کنید.',
                    'IPها همان نشانی‌ای هستند که StoreServer در لحظه‌ی درخواست دیده است؛ شناسایی دارنده‌ی IP فقط از طریق استعلام قانونی از ISP/اپراتور ممکن است.',
                    'اگر سرور پشت پراکسی/CDN باشد و TrustProxies درست تنظیم نشده باشد، IPهای خصوصی/داخلی ثبت می‌شوند (ستون «عمومی» در جدول IPها).',
                    'لاگ‌های قدیمی بر اساس سیاست نگهداری سرور پاک می‌شوند؛ این گزارش تصویر لحظه‌ی تولید است.',
                ],
            ],
            'summary' => [
                'distinct_ips'        => count($ips),
                'public_ips'          => count($publicIps),
                'first_seen_at'       => $device ? $this->iso($device->first_seen_at) : null,
                'last_seen_at'        => $this->iso($license->last_seen_at),
                'heartbeats_total'    => $heartbeats['total'],
                'security_total'      => $security['total'],
                'security_critical'   => $security['critical'],
                'api_failures_total'  => $api['failures_total'],
                'activation_attempts' => count($activations),
                'chain_status'        => $clientLogs['chain']['status'] ?? null,
            ],
            'license'  => $this->licenseBlock($license),
            'customer' => $this->customerBlock($license),
            'device'   => $this->deviceBlock($device),
            'activation_requests' => $activations,
            'ip_addresses'        => $ips,
            'heartbeats'          => $heartbeats,
            'api_requests'        => $api,
            'security_events'     => $security,
            'client_logs'         => $clientLogs,
            'plan_history'        => $history,
            'admin_actions'       => $admin,
            'timeline'            => ['total' => count($timeline), 'rows' => $timeline],
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  بلوک‌های هویتی                                                     */
    /* ------------------------------------------------------------------ */

    /** @return array<string, mixed> */
    private function licenseBlock(License $license): array
    {
        return [
            'uuid'           => $license->uuid,
            'status'         => $license->status,
            'plan'           => $license->plan?->only(['code', 'name']),
            'duration_type'  => $license->duration_type,
            'created_at'     => $this->iso($license->created_at),
            'activated_at'   => $this->iso($license->activated_at),
            'expires_at'     => $this->iso($license->expires_at),
            'suspended_at'   => $this->iso($license->suspended_at),
            'suspend_reason' => $license->suspend_reason,
            'revoked_at'     => $this->iso($license->revoked_at),
            'revoke_reason'  => $license->revoke_reason,
            'last_seen_at'   => $this->iso($license->last_seen_at),
            'issued_by'      => $license->issuer?->name,
            'note'           => $license->note,
        ];
    }

    /** @return array<string, mixed>|null */
    private function customerBlock(License $license): ?array
    {
        $c = $license->customer;

        if ($c === null) {
            return null;
        }

        return [
            'uuid'        => $c->uuid,
            'name'        => $c->name,
            'company'     => $c->company,
            'phone'       => $c->phone,
            'email'       => $c->email,
            'national_id' => $c->national_id,
            'province'    => $c->province,
            'city'        => $c->city,
            'address'     => $c->address,
        ];
    }

    /** @return array<string, mixed>|null */
    private function deviceBlock(?Device $d): ?array
    {
        if ($d === null) {
            return null;
        }

        return [
            'fingerprint'        => $d->fingerprint,
            'hostname'           => $d->hostname,
            'os'                 => $d->os,
            'os_version'         => $d->os_version,
            'cpu'                => $d->cpu,
            'ram_mb'             => $d->ram_mb,
            'motherboard_serial' => $d->motherboard_serial,
            'disk_serial'        => $d->disk_serial,
            'mac_address'        => $d->mac_address,
            'timezone'           => $d->timezone,
            'app_version'        => $d->app_version,
            'last_ip'            => $d->last_ip,
            'first_seen_at'      => $this->iso($d->first_seen_at),
            'last_heartbeat_at'  => $this->iso($d->last_heartbeat_at),
            'system_info'        => $d->system_info,
        ];
    }

    /** @return list<array<string, mixed>> */
    private function activations(License $license, ?Device $device): array
    {
        return ActivationRequest::query()
            ->with('reviewer:id,name')
            ->where(function (Builder $q) use ($license, $device): void {
                $q->where('license_id', $license->getKey());

                if ($device !== null) {
                    $q->orWhere('fingerprint', $device->fingerprint);
                }
            })
            ->orderBy('id')
            ->get()
            ->map(fn (ActivationRequest $r): array => [
                'uuid'           => $r->uuid,
                'status'         => $r->status,
                'customer_name'  => $r->customer_name,
                'customer_phone' => $r->customer_phone,
                'request_ip'     => $r->request_ip,
                'fingerprint'    => $r->fingerprint,
                'app_version'    => $r->app_version,
                'system_info'    => $r->system_info,
                'created_at'     => $this->iso($r->created_at),
                'reviewed_at'    => $this->iso($r->reviewed_at),
                'reviewed_by'    => $r->reviewer?->name,
                'reject_reason'  => $r->reject_reason,
            ])
            ->all();
    }

    /* ------------------------------------------------------------------ */
    /*  IPها                                                               */
    /* ------------------------------------------------------------------ */

    /**
     * @param  list<array<string, mixed>>  $activations
     * @return list<array<string, mixed>>
     */
    private function ipStats(License $license, ?Device $device, array $activations): array
    {
        $sources = [
            'heartbeat'     => HeartbeatLog::query()->where('license_id', $license->getKey()),
            'api'           => $this->ownedBy(ApiRequestLog::query(), $license, $device),
            'license_event' => LicenseEventLog::query()->where('license_id', $license->getKey()),
            'security'      => $this->ownedBy(SecurityEvent::query(), $license, $device),
        ];

        $map = [];

        $add = function (string $ip, string $source, ?string $first, ?string $last, int $hits) use (&$map): void {
            $map[$ip] ??= [
                'ip'         => $ip,
                'is_public'  => $this->isPublicIp($ip),
                'first_seen' => null,
                'last_seen'  => null,
                'hits'       => 0,
                'by_source'  => [],
            ];

            if ($first !== null && ($map[$ip]['first_seen'] === null || $first < $map[$ip]['first_seen'])) {
                $map[$ip]['first_seen'] = $first;
            }

            if ($last !== null && ($map[$ip]['last_seen'] === null || $last > $map[$ip]['last_seen'])) {
                $map[$ip]['last_seen'] = $last;
            }

            $map[$ip]['hits'] += $hits;
            $map[$ip]['by_source'][$source] = ($map[$ip]['by_source'][$source] ?? 0) + $hits;
        };

        foreach ($sources as $name => $query) {
            $rows = $query
                ->whereNotNull('ip')->where('ip', '!=', '')
                ->selectRaw('ip, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen, COUNT(*) AS hits')
                ->groupBy('ip')
                ->get();

            foreach ($rows as $row) {
                $add((string) $row->ip, $name, $this->iso($row->first_seen), $this->iso($row->last_seen), (int) $row->hits);
            }
        }

        foreach ($activations as $a) {
            if (! empty($a['request_ip'])) {
                $add((string) $a['request_ip'], 'activation', $a['created_at'], $a['created_at'], 1);
            }
        }

        // آخرین IP روی دستگاه؛ حتی اگر لاگ‌های قدیمی پاک شده باشند باقی می‌ماند
        if ($device !== null && ! empty($device->last_ip)) {
            $add((string) $device->last_ip, 'device', $this->iso($device->last_heartbeat_at), $this->iso($device->last_heartbeat_at), 0);
        }

        $list = array_values($map);
        usort($list, static fn (array $a, array $b): int => strcmp((string) $a['first_seen'], (string) $b['first_seen']));

        return $list;
    }

    private function isPublicIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    /** @param Builder<*> $query @return Builder<*> */
    private function ownedBy(Builder $query, License $license, ?Device $device): Builder
    {
        return $query->where(function (Builder $q) use ($license, $device): void {
            $q->where('license_id', $license->getKey());

            if ($device !== null) {
                $q->orWhere('fingerprint', $device->fingerprint);
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  لاگ‌ها                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, mixed> */
    private function heartbeats(License $license): array
    {
        $base = fn (): Builder => HeartbeatLog::query()->where('license_id', $license->getKey());

        $map = static fn (HeartbeatLog $h): array => [
            'at'             => $h->created_at?->utc()->format('Y-m-d\TH:i:s\Z'),
            'ip'             => $h->ip,
            'app_version'    => $h->app_version,
            'license_status' => $h->license_status,
            'plan_code'      => $h->plan_code,
            'modules_used'   => $h->modules_used,
            'duration_ms'    => $h->duration_ms,
        ];

        return [
            'total'    => $base()->count(),
            'first_at' => $this->iso($base()->min('created_at')),
            'last_at'  => $this->iso($base()->max('created_at')),
            'versions' => $base()->whereNotNull('app_version')->distinct()->pluck('app_version')->values()->all(),
            'first'    => $base()->orderBy('id')->limit(20)->get()->map($map)->all(),
            'recent'   => $base()->orderByDesc('id')->limit(self::CAP_HEARTBEATS)->get()->map($map)->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function apiRequests(License $license, ?Device $device): array
    {
        $base = fn (): Builder => $this->ownedBy(ApiRequestLog::query(), $license, $device);

        return [
            'total'          => $base()->count(),
            'failures_total' => $base()->where('status_code', '>=', 400)->count(),
            'by_status'      => $base()->selectRaw('status_code, COUNT(*) AS n')->groupBy('status_code')->orderBy('status_code')->pluck('n', 'status_code')->all(),
            'failures'       => $base()->where('status_code', '>=', 400)->orderByDesc('id')->limit(self::CAP_API)->get()
                ->map(fn (ApiRequestLog $r): array => [
                    'at'          => $this->iso($r->created_at),
                    'ip'          => $r->ip,
                    'method'      => $r->method,
                    'path'        => $r->path,
                    'status_code' => $r->status_code,
                    'error_code'  => $r->error_code,
                    'fingerprint' => $r->fingerprint,
                    'user_agent'  => $r->user_agent,
                    'request_id'  => $r->request_id,
                ])->all(),
        ];
    }

    /** @return array{total: int, critical: int, rows: list<array<string, mixed>>} */
    private function securityEvents(License $license, ?Device $device): array
    {
        $base = fn (): Builder => $this->ownedBy(SecurityEvent::query(), $license, $device);

        return [
            'total'    => $base()->count(),
            'critical' => $base()->where('severity', 'critical')->count(),
            'rows'     => $base()->orderByDesc('id')->limit(self::CAP_EVENTS)->get()->reverse()->values()
                ->map(fn (SecurityEvent $e): array => [
                    'at'          => $this->iso($e->created_at),
                    'type'        => $e->type,
                    'severity'    => $e->severity,
                    'ip'          => $e->ip,
                    'endpoint'    => $e->endpoint,
                    'fingerprint' => $e->fingerprint,
                    'message'     => $e->message,
                    'context'     => $e->context,
                ])->all(),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function licenseEvents(License $license): array
    {
        return LicenseEventLog::query()
            ->where('license_id', $license->getKey())
            ->orderByDesc('id')->limit(self::CAP_EVENTS)->get()->reverse()->values()
            ->map(fn (LicenseEventLog $e): array => [
                'at'       => $this->iso($e->created_at),
                'event'    => $e->event,
                'severity' => $e->severity,
                'ip'       => $e->ip,
                'message'  => $e->message,
                'context'  => $e->context,
            ])->all();
    }

    /** @return list<array<string, mixed>> */
    private function planHistory(License $license): array
    {
        return $license->history
            ->sortBy('id')
            ->map(fn ($h): array => [
                'at'              => $this->iso($h->created_at),
                'action'          => $h->action,
                'from_plan'       => $h->fromPlan?->code,
                'to_plan'         => $h->toPlan?->code,
                'from_expires_at' => $this->iso($h->from_expires_at),
                'to_expires_at'   => $this->iso($h->to_expires_at),
                'performed_by'    => $h->performer?->name,
                'note'            => $h->note,
            ])->values()->all();
    }

    /** @return list<array<string, mixed>> */
    private function adminActions(License $license): array
    {
        return AuditLog::query()
            ->where('entity_type', 'License')->where('entity_id', $license->getKey())
            ->orderBy('id')->limit(self::CAP_EVENTS)->get()
            ->map(fn (AuditLog $a): array => [
                'at'          => $this->iso($a->created_at),
                'action'      => $a->action,
                'description' => $a->description,
                'user_name'   => $a->user_name,
                'ip'          => $a->ip,
                'user_agent'  => $a->user_agent,
                'new_values'  => $a->new_values,
            ])->all();
    }

    /**
     * وضعیت زنجیره‌ی هش لاگ اپ + نمونه‌ی رویدادهای امنیتی ثبت‌شده توسط خود اپ.
     *
     * @return array<string, mixed>
     */
    private function clientLogs(License $license, ?Device $device): array
    {
        $base = fn (): Builder => ClientAuditLog::query()->where('license_id', $license->getKey());

        $chain = $device !== null ? ClientChainState::query()->where('device_id', $device->getKey())->first() : null;
        $last  = $base()->orderByDesc('sequence')->first(['sequence', 'hash', 'occurred_at']);

        return [
            'total'          => $base()->count(),
            'first_sequence' => $base()->min('sequence'),
            'last_sequence'  => $last?->sequence,
            'last_hash'      => $last?->hash,
            'first_at'       => $this->iso($base()->min('occurred_at')),
            'last_at'        => $this->iso($last?->occurred_at),
            'by_channel'     => $base()->selectRaw('channel, COUNT(*) AS n')->groupBy('channel')->pluck('n', 'channel')->all(),
            'chain'          => $chain ? [
                'status'          => $chain->status,
                'reason'          => $chain->reason,
                'broken_sequence' => $chain->broken_sequence,
                'missing_from'    => $chain->missing_from,
                'verified_at'     => $this->iso($chain->verified_at),
            ] : null,
            'security_sample' => $base()->where('channel', 'security')->orderByDesc('id')->limit(self::CAP_CLIENT)->get()
                ->map(fn (ClientAuditLog $l): array => [
                    'at'          => $this->iso($l->occurred_at),
                    'sequence'    => $l->sequence,
                    'level'       => $l->level,
                    'action'      => $l->action,
                    'description' => $l->description,
                    'actor_name'  => $l->actor_name,
                    'ip'          => $l->ip,
                    'route'       => $l->route,
                ])->all(),
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  خط زمانی یکپارچه                                                   */
    /* ------------------------------------------------------------------ */

    /**
     * @param  list<array<string, mixed>>  $events
     * @param  list<array<string, mixed>>  $security
     * @param  list<array<string, mixed>>  $history
     * @param  list<array<string, mixed>>  $activations
     * @param  list<array<string, mixed>>  $admin
     * @return list<array<string, mixed>>
     */
    private function timeline(array $events, array $security, array $history, array $activations, array $admin): array
    {
        $rows = [];

        foreach ($events as $e) {
            $rows[] = ['at' => $e['at'], 'source' => 'license_event', 'type' => $e['event'], 'severity' => $e['severity'], 'ip' => $e['ip'], 'actor' => null, 'message' => $e['message']];
        }

        foreach ($security as $e) {
            $rows[] = ['at' => $e['at'], 'source' => 'security', 'type' => $e['type'], 'severity' => $e['severity'], 'ip' => $e['ip'], 'actor' => null, 'message' => $e['message']];
        }

        foreach ($history as $h) {
            $rows[] = ['at' => $h['at'], 'source' => 'plan_history', 'type' => $h['action'], 'severity' => 'info', 'ip' => null, 'actor' => $h['performed_by'], 'message' => $h['note']];
        }

        foreach ($activations as $a) {
            $rows[] = ['at' => $a['created_at'], 'source' => 'activation', 'type' => 'activation.' . $a['status'], 'severity' => 'info', 'ip' => $a['request_ip'], 'actor' => $a['customer_name'], 'message' => $a['reject_reason']];
        }

        foreach ($admin as $a) {
            $rows[] = ['at' => $a['at'], 'source' => 'admin', 'type' => $a['action'], 'severity' => 'info', 'ip' => $a['ip'], 'actor' => $a['user_name'], 'message' => $a['description']];
        }

        usort($rows, static fn (array $a, array $b): int => strcmp((string) $a['at'], (string) $b['at']));

        return $rows;
    }

    private function iso(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $date = $value instanceof DateTimeInterface
            ? Carbon::instance($value)
            : Carbon::parse((string) $value, 'UTC');

        return $date->utc()->format('Y-m-d\TH:i:s\Z');
    }
}