import { Head } from '@inertiajs/react';
import { Activity, FileArchive, FileJson, Globe, Printer, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { KeyValue } from '@/Components/ui/KeyValue';
import { PageHeader } from '@/Components/ui/PageHeader';
import { StatCard } from '@/Components/ui/StatCard';
import { Tabs } from '@/Components/ui/Tabs';
import AdminLayout from '@/Layouts/AdminLayout';
import { formatBytes, formatDate, formatNumber } from '@/lib/utils';
import type { EvidenceActivation, EvidenceAdminAction, EvidenceHeartbeatRow, EvidenceIntegrity, EvidenceIp, EvidenceReport, EvidenceSecurityRow, EvidenceTimelineRow } from '@/types/evidence';
import { evidenceSource, evidenceVerified } from '@/types/evidence';
import type { PageProps } from '@/types';

type Props = PageProps<{ license: { uuid: string; status: string }; report: EvidenceReport; integrity: EvidenceIntegrity }>;

type Tab = 'ips' | 'timeline' | 'security' | 'activations' | 'hardware' | 'heartbeats' | 'admin' | 'client';

const sevTone = (s: string | null): 'danger' | 'warning' | 'neutral' => (s === 'critical' || s === 'error' ? 'danger' : s === 'warning' ? 'warning' : 'neutral');

export default function EvidenceShow({ license, report, integrity }: Props) {
    const [tab, setTab] = useState<Tab>('ips');
    const ok = evidenceVerified(integrity);
    const s = report.summary;
    const base: [string, string] = [license.uuid, report.meta.report_id];

    return (
        <>
            <Head title={`گزارش مدرک - ${report.meta.case.title}`} />
            <PageHeader
                breadcrumbs={[
                    { label: 'لایسنس‌ها', href: route('admin.licenses.index') },
                    { label: license.uuid.slice(0, 8), href: route('admin.licenses.show', license.uuid) },
                    { label: 'گزارش مدرک', href: route('admin.evidence.index', license.uuid) },
                    { label: report.meta.report_id.slice(0, 8) },
                ]}
                title={report.meta.case.title}
                badge={ok ? <Badge tone="success" dot>هش تأییدشده</Badge> : <Badge tone="danger" dot pulse>مغایرت هش</Badge>}
                description={`تولید: ${formatDate(report.meta.generated_at)}${report.meta.generated_by ? ` · ${report.meta.generated_by.name}` : ''}${report.meta.case.reference ? ` · پرونده ${report.meta.case.reference}` : ''}`}
                actions={
                    <>
                        <a href={`${route('admin.evidence.print', base)}?auto=1`} target="_blank" rel="noreferrer">
                            <Button variant="secondary" icon={<Printer className="size-4" />}>چاپ / PDF</Button>
                        </a>
                        <a href={route('admin.evidence.download', [...base, 'json'])}>
                            <Button variant="secondary" icon={<FileJson className="size-4" />} disabled={!ok}>JSON</Button>
                        </a>
                        <a href={route('admin.evidence.download', [...base, 'zip'])}>
                            <Button icon={<FileArchive className="size-4" />} disabled={!ok}>دانلود بسته (ZIP)</Button>
                        </a>
                    </>
                }
            />

            {!ok && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200 ring-1 ring-rose-500/30">
                    <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                    <p>هش فایل این گزارش با مقدار ثبت‌شده در زمان تولید مطابقت ندارد؛ ممکن است فایل روی سرور تغییر کرده باشد. این گزارش به‌عنوان مدرک قابل‌اتکا نیست و دانلود آن غیرفعال شده است.</p>
                </div>
            )}

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="IP متمایز" value={s.distinct_ips} icon={Globe} tone="sky" hint={`${formatNumber(s.public_ips)} عمومی`} />
                <StatCard label="ضربان‌های ثبت‌شده" value={s.heartbeats_total} icon={Activity} tone="emerald" />
                <StatCard label="رویداد امنیتی" value={s.security_total} icon={ShieldAlert} tone={s.security_critical > 0 ? 'rose' : 'amber'} hint={`${formatNumber(s.security_critical)} بحرانی`} />
                <StatCard label="درخواست ناموفق API" value={s.api_failures_total} icon={TriangleAlert} tone="violet" />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader title="خلاصه‌ی پرونده" />
                    <KeyValue
                        columns={3}
                        items={[
                            { label: 'مشتری', value: report.customer?.name ?? '—' },
                            { label: 'تلفن', value: report.customer?.phone ?? '—', mono: true },
                            { label: 'کد ملی', value: report.customer?.national_id ?? '—', mono: true },
                            { label: 'لایسنس', value: report.license.uuid, mono: true },
                            { label: 'وضعیت', value: report.license.status },
                            { label: 'پلن', value: report.license.plan?.name ?? '—' },
                            { label: 'اولین اتصال دستگاه', value: formatDate(s.first_seen_at) },
                            { label: 'آخرین مشاهده', value: formatDate(s.last_seen_at) },
                            { label: 'نام دستگاه', value: report.device?.hostname ?? '—' },
                        ]}
                    />
                    {report.meta.case.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-white/[.03] p-3 text-sm leading-7 text-neutral-300 ring-1 ring-white/[.06]">{report.meta.case.notes}</p>}
                </Card>

                <Card>
                    <CardHeader title="صحت و زنجیره‌ی نگهداری" action={<ShieldCheck className={ok ? 'size-5 text-emerald-400' : 'size-5 text-rose-400'} />} />
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="mb-1 text-xs text-neutral-500">SHA-256 ({formatBytes(integrity.bytes)})</p>
                            <div className="flex items-start gap-1"><Mono className="break-all text-[11px] text-amber-200">{integrity.sha256}</Mono><CopyButton value={integrity.sha256} /></div>
                        </div>
                        <Check ok={integrity.file_ok} label="فایل با هش زمان تولید یکی است" />
                        <Check ok={integrity.log_ok} label="هش در لاگ فقط‌افزودنی (audit_logs) ثبت شده" />
                        <Check ok={s.chain_status === null ? null : s.chain_status === 'ok'} label={`زنجیره‌ی هش لاگ اپ: ${s.chain_status ?? 'نامشخص'}`} />
                    </div>
                </Card>
            </div>

            <Tabs<Tab>
                id="evidence-tabs"
                className="mb-4"
                value={tab}
                onChange={setTab}
                tabs={[
                    { value: 'ips', label: 'IPها', count: report.ip_addresses.length },
                    { value: 'timeline', label: 'خط زمانی', count: report.timeline.total },
                    { value: 'security', label: 'رویداد امنیتی', count: report.security_events.total },
                    { value: 'activations', label: 'فعال‌سازی‌ها', count: report.activation_requests.length },
                    { value: 'hardware', label: 'سخت‌افزار' },
                    { value: 'heartbeats', label: 'ضربان‌ها', count: report.heartbeats.total },
                    { value: 'admin', label: 'اقدامات مدیر', count: report.admin_actions.length },
                    { value: 'client', label: 'لاگ اپ', count: report.client_logs.total },
                ]}
            />

            <Card padded={false}>
                {tab === 'ips' && <IpTable rows={report.ip_addresses} />}
                {tab === 'timeline' && <TimelineTable rows={report.timeline.rows} />}
                {tab === 'security' && <SecurityTable rows={report.security_events.rows} />}
                {tab === 'activations' && <ActivationTable rows={report.activation_requests} />}
                {tab === 'hardware' && <Hardware report={report} />}
                {tab === 'heartbeats' && <HeartbeatTable rows={report.heartbeats.recent} total={report.heartbeats.total} />}
                {tab === 'admin' && <AdminTable rows={report.admin_actions} />}
                {tab === 'client' && <ClientLogs report={report} />}
            </Card>

            <ul className="mt-6 list-disc space-y-1 pr-5 text-xs leading-6 text-neutral-500">
                {report.meta.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
        </>
    );
}

EvidenceShow.layout = (page: ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* ------------------------------------------------------------------ */

function Check({ ok, label }: { ok: boolean | null; label: string }) {
    const tone = ok === null ? 'text-neutral-500' : ok ? 'text-emerald-300' : 'text-rose-300';
    return <p className={`flex items-center gap-2 text-xs ${tone}`}><span className="inline-block size-1.5 rounded-full bg-current" />{label}{ok === null && ' (نامشخص)'}</p>;
}

function Utc({ at }: { at: string | null }) {
    if (!at) return <span className="text-neutral-600">—</span>;
    return <div><p className="text-xs text-neutral-300">{formatDate(at)}</p><Mono className="text-[10px] text-neutral-500">{at}</Mono></div>;
}

/** جدول با «نمایش بیشتر» تا صفحه با هزاران ردیف سنگین نشود */
function Paged<T>({ rows, columns, rowKey, empty, pageSize = 50 }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T, i: number) => string | number; empty: string; pageSize?: number }) {
    const [n, setN] = useState(pageSize);
    const shown = rows.slice(0, n);
    return (
        <>
            <DataTable columns={columns} rows={shown} rowKey={(r) => rowKey(r, rows.indexOf(r))} emptyTitle={empty} dense />
            {rows.length > n && (
                <div className="flex items-center justify-between border-t border-white/[.06] p-3 text-xs text-neutral-500">
                    <span>{formatNumber(n)} از {formatNumber(rows.length)}؛ همه‌ی ردیف‌ها در فایل ZIP هست.</span>
                    <Button size="xs" variant="ghost" onClick={() => setN(n + pageSize * 4)}>نمایش بیشتر</Button>
                </div>
            )}
        </>
    );
}

function IpTable({ rows }: { rows: EvidenceIp[] }) {
    const columns: Column<EvidenceIp>[] = [
        { key: 'ip', header: 'IP', render: (r) => <div className="flex items-center gap-2"><Mono className="text-amber-200">{r.ip}</Mono><CopyButton value={r.ip} />{!r.is_public && <Badge tone="warning" size="sm">خصوصی</Badge>}</div> },
        { key: 'first', header: 'اولین مشاهده', render: (r) => <Utc at={r.first_seen} /> },
        { key: 'last', header: 'آخرین مشاهده', render: (r) => <Utc at={r.last_seen} /> },
        { key: 'hits', header: 'تعداد', hideBelow: 'md', render: (r) => <span className="tabular-nums text-neutral-300">{formatNumber(r.hits)}</span> },
        { key: 'src', header: 'منبع', hideBelow: 'lg', render: (r) => <span className="text-xs text-neutral-400">{Object.entries(r.by_source).map(([k, v]) => `${evidenceSource[k] ?? k}: ${v}`).join(' · ')}</span> },
    ];
    return <Paged rows={rows} columns={columns} rowKey={(r) => r.ip} empty="IPای ثبت نشده است" />;
}

function TimelineTable({ rows }: { rows: EvidenceTimelineRow[] }) {
    const columns: Column<EvidenceTimelineRow>[] = [
        { key: 'at', header: 'زمان', render: (r) => <Utc at={r.at} /> },
        { key: 'src', header: 'منبع', hideBelow: 'md', render: (r) => <Badge size="sm">{evidenceSource[r.source] ?? r.source}</Badge> },
        { key: 'type', header: 'رویداد', render: (r) => <div><Mono className="text-amber-200">{r.type}</Mono>{r.message && <p className="max-w-md truncate text-xs text-neutral-500" title={r.message}>{r.message}</p>}</div> },
        { key: 'sev', header: 'شدت', hideBelow: 'lg', render: (r) => (r.severity ? <Badge tone={sevTone(r.severity)} size="sm">{r.severity}</Badge> : null) },
        { key: 'ip', header: 'IP', hideBelow: 'md', render: (r) => (r.ip ? <Mono>{r.ip}</Mono> : null) },
        { key: 'actor', header: 'عامل', hideBelow: 'xl', render: (r) => <span className="text-xs text-neutral-400">{r.actor ?? ''}</span> },
    ];
    return <Paged rows={rows} columns={columns} rowKey={(_, i) => i} empty="رویدادی ثبت نشده است" />;
}

function SecurityTable({ rows }: { rows: EvidenceSecurityRow[] }) {
    const columns: Column<EvidenceSecurityRow>[] = [
        { key: 'at', header: 'زمان', render: (r) => <Utc at={r.at} /> },
        { key: 'type', header: 'نوع', render: (r) => <div className="flex items-center gap-2"><Badge tone={sevTone(r.severity)} size="sm">{r.severity}</Badge><Mono className="text-amber-200">{r.type}</Mono></div> },
        { key: 'msg', header: 'شرح', hideBelow: 'md', render: (r) => <span className="text-xs text-neutral-400">{r.message}</span> },
        { key: 'ip', header: 'IP', render: (r) => (r.ip ? <Mono>{r.ip}</Mono> : null) },
        { key: 'ep', header: 'مسیر', hideBelow: 'xl', render: (r) => <Mono className="text-neutral-500">{r.endpoint ?? ''}</Mono> },
    ];
    return <Paged rows={rows} columns={columns} rowKey={(_, i) => i} empty="رویداد امنیتی‌ای ثبت نشده است" />;
}

function ActivationTable({ rows }: { rows: EvidenceActivation[] }) {
    const columns: Column<EvidenceActivation>[] = [
        { key: 'at', header: 'زمان درخواست', render: (r) => <Utc at={r.created_at} /> },
        { key: 'who', header: 'متقاضی', render: (r) => <div><p className="text-sm text-white">{r.customer_name ?? '—'}</p><p className="text-xs text-neutral-500">{r.customer_phone}</p></div> },
        { key: 'ip', header: 'IP', render: (r) => (r.request_ip ? <Mono>{r.request_ip}</Mono> : null) },
        { key: 'st', header: 'وضعیت', render: (r) => <Badge size="sm">{r.status}</Badge> },
        { key: 'rev', header: 'بررسی', hideBelow: 'lg', render: (r) => <span className="text-xs text-neutral-400">{r.reviewed_by ?? '—'} {r.reject_reason ? `· ${r.reject_reason}` : ''}</span> },
    ];
    return <Paged rows={rows} columns={columns} rowKey={(r) => r.uuid} empty="درخواست فعال‌سازی‌ای ثبت نشده است" />;
}

function HeartbeatTable({ rows, total }: { rows: EvidenceHeartbeatRow[]; total: number }) {
    const columns: Column<EvidenceHeartbeatRow>[] = [
        { key: 'at', header: 'زمان', render: (r) => <Utc at={r.at} /> },
        { key: 'ip', header: 'IP', render: (r) => (r.ip ? <Mono>{r.ip}</Mono> : null) },
        { key: 'v', header: 'نسخه', hideBelow: 'md', render: (r) => <Mono>{r.app_version}</Mono> },
        { key: 'st', header: 'وضعیت لایسنس', hideBelow: 'md', render: (r) => <span className="text-xs text-neutral-400">{r.license_status}</span> },
    ];
    return (
        <>
            <p className="border-b border-white/[.06] p-3 text-xs text-neutral-500">جدیدترین {formatNumber(rows.length)} مورد از {formatNumber(total)}؛ ۲۰ مورد اول و آمار کامل در فایل JSON هست.</p>
            <Paged rows={rows} columns={columns} rowKey={(_, i) => i} empty="ضربانی ثبت نشده است" />
        </>
    );
}

function AdminTable({ rows }: { rows: EvidenceAdminAction[] }) {
    const columns: Column<EvidenceAdminAction>[] = [
        { key: 'at', header: 'زمان', render: (r) => <Utc at={r.at} /> },
        { key: 'a', header: 'اقدام', render: (r) => <div><Mono className="text-amber-200">{r.action}</Mono><p className="text-xs text-neutral-500">{r.description}</p></div> },
        { key: 'u', header: 'مدیر', render: (r) => <span className="text-xs text-neutral-300">{r.user_name ?? '—'}</span> },
        { key: 'ip', header: 'IP', hideBelow: 'md', render: (r) => (r.ip ? <Mono>{r.ip}</Mono> : null) },
    ];
    return <Paged rows={rows} columns={columns} rowKey={(_, i) => i} empty="اقدام ثبت‌شده‌ای نیست" />;
}

function Hardware({ report }: { report: EvidenceReport }) {
    const d = report.device;
    if (!d) return <p className="p-6 text-sm text-neutral-500">دستگاهی به این لایسنس متصل نشده است.</p>;
    return (
        <div className="space-y-4 p-5">
            <KeyValue
                columns={3}
                items={[
                    { label: 'نام دستگاه', value: d.hostname ?? '—' },
                    { label: 'سیستم‌عامل', value: [d.os, d.os_version].filter(Boolean).join(' ') || '—' },
                    { label: 'CPU', value: d.cpu ?? '—' },
                    { label: 'RAM', value: d.ram_mb ? `${formatNumber(Math.round(d.ram_mb / 1024))} GB` : '—' },
                    { label: 'سریال مادربرد', value: d.motherboard_serial ?? '—', mono: true },
                    { label: 'سریال دیسک', value: d.disk_serial ?? '—', mono: true },
                    { label: 'MAC', value: d.mac_address ?? '—', mono: true },
                    { label: 'آخرین IP', value: d.last_ip ?? '—', mono: true },
                    { label: 'Fingerprint', value: d.fingerprint, mono: true },
                ]}
            />
            {d.system_info && <pre dir="ltr" className="max-h-72 overflow-auto rounded-xl bg-neutral-950 p-3 text-left font-mono text-[11px] leading-5 text-neutral-400 ring-1 ring-white/[.06]">{JSON.stringify(d.system_info, null, 2)}</pre>}
        </div>
    );
}

function ClientLogs({ report }: { report: EvidenceReport }) {
    const c = report.client_logs;
    return (
        <div className="space-y-4 p-5">
            <KeyValue
                columns={3}
                items={[
                    { label: 'تعداد لاگ دریافتی', value: formatNumber(c.total) },
                    { label: 'وضعیت زنجیره', value: c.chain ? `${c.chain.status}${c.chain.reason ? ` (${c.chain.reason})` : ''}` : '—' },
                    { label: 'بازه‌ی sequence', value: c.first_sequence !== null ? `${c.first_sequence} → ${c.last_sequence}` : '—', mono: true },
                    { label: 'اولین لاگ', value: formatDate(c.first_at) },
                    { label: 'آخرین لاگ', value: formatDate(c.last_at) },
                    { label: 'هش آخرین لاگ', value: c.last_hash ? `${c.last_hash.slice(0, 20)}…` : '—', mono: true },
                ]}
            />
            <Paged
                rows={c.security_sample}
                rowKey={(r) => r.sequence}
                empty="رویداد امنیتی‌ای از سمت اپ گزارش نشده"
                columns={[
                    { key: 'at', header: 'زمان', render: (r) => <Utc at={r.at} /> },
                    { key: 'a', header: 'اقدام', render: (r) => <div><Mono className="text-amber-200">{r.action}</Mono><p className="text-xs text-neutral-500">{r.description}</p></div> },
                    { key: 'u', header: 'کاربر اپ', hideBelow: 'md', render: (r) => <span className="text-xs text-neutral-400">{r.actor_name ?? ''}</span> },
                    { key: 'ip', header: 'IP ثبت‌شده در اپ', hideBelow: 'lg', render: (r) => (r.ip ? <Mono>{r.ip}</Mono> : null) },
                ]}
            />
        </div>
    );
}