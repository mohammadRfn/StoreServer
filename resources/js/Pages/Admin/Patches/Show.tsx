import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CalendarClock, FileCode2, FileText, Fingerprint, Link2, Package, Rocket, Undo2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Badge, StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { Field, Input } from '@/Components/ui/Field';
import { KeyValue } from '@/Components/ui/KeyValue';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { useCan } from '@/Hooks/useCan';
import AdminLayout from '@/Layouts/AdminLayout';
import { EASE_OUT_EXPO } from '@/lib/motion';
import { devicePatchState, patchStatus, patchTargetType } from '@/lib/status';
import { cn, formatBytes, formatDate, formatNumber } from '@/lib/utils';
import type { DevicePatchStatus, PageProps, Patch } from '@/types';

type Props = PageProps<{ patch: Patch }>;
type Action = 'publish' | 'schedule' | 'withdraw' | null;

export default function PatchShow({ patch }: Props) {
    const { can } = useCan();
    const [action, setAction] = useState<Action>(null);
    const [busy, setBusy] = useState(false);
    const statuses = patch.device_statuses ?? [];
    const applied = statuses.filter((s) => s.status === 'applied').length;
    const failed = statuses.filter((s) => s.status === 'failed').length;
    const pct = statuses.length ? Math.round((applied / statuses.length) * 100) : 0;

    const post = (name: string, data: Record<string, string | number | boolean | null | undefined> = {}) => {
        setBusy(true);
        router.post(route(name, patch.patch_code), data, { preserveScroll: true, onFinish: () => { setBusy(false); setAction(null); } });
    };

    const fileCols: Column<NonNullable<Patch['files']>[number]>[] = [
        { key: 'path', header: 'مسیر', render: (f) => <Mono>{f.path}</Mono> },
        { key: 'action', header: 'عمل', render: (f) => <Badge size="sm" tone={f.action === 'delete' ? 'danger' : f.action === 'add' ? 'success' : 'info'}>{f.action}</Badge> },
        { key: 'size', header: 'حجم', hideBelow: 'md', render: (f) => <span className="text-xs text-neutral-400">{formatBytes(f.size)}</span> },
        { key: 'sha', header: 'SHA-256', hideBelow: 'lg', render: (f) => <Mono className="text-neutral-500">{f.sha256.slice(0, 16)}…</Mono> },
    ];
    const devCols: Column<DevicePatchStatus>[] = [
        { key: 'dev', header: 'دستگاه', render: (s) => <Link href={route('admin.devices.show', s.device_id)} onClick={(e) => e.stopPropagation()} className="hover:text-amber-300"><p className="text-sm text-white">{s.device?.hostname ?? '—'}</p><Mono className="text-neutral-500">{s.device?.fingerprint.slice(0, 14)}</Mono></Link> },
        { key: 'status', header: 'وضعیت', render: (s) => <div className="flex items-center gap-2"><StatusBadge status={s.status} map={devicePatchState} size="sm" />{s.is_blocked && <Badge tone="danger" size="sm">مسدود</Badge>}</div> },
        { key: 'att', header: 'تلاش/خطا', hideBelow: 'md', render: (s) => <span className="text-xs tabular-nums">{formatNumber(s.attempts)} / <span className={s.failure_count ? 'text-rose-300' : ''}>{formatNumber(s.failure_count)}</span></span> },
        { key: 'ver', header: 'نسخه', hideBelow: 'lg', render: (s) => <Mono>{s.device?.app_version ?? s.version_before ?? '?'}</Mono> },
        { key: 'last', header: 'آخرین گزارش', hideBelow: 'lg', render: (s) => <span className="text-xs text-neutral-400">{formatDate(s.last_reported_at)}</span> },
    ];

    return (
        <>
            <Head title={`پچ ${patch.patch_code}`} />
            <PageHeader
                breadcrumbs={[{ label: 'پچ‌ها', href: route('admin.patches.index') }, { label: patch.patch_code }]}
                title={patch.title}
                badge={<div className="flex items-center gap-2"><StatusBadge status={patch.status} map={patchStatus} />{patch.is_mandatory && <Badge tone="danger">اجباری</Badge>}{patch.requires_restart && <Badge tone="info">نیازمند ری‌استارت</Badge>}</div>}
                description={<span className="flex items-center gap-1"><Mono>{patch.patch_code}</Mono><CopyButton value={patch.patch_code} /> · {patch.from_min ?? '*'}–{patch.from_max ?? '*'} → <Mono className="text-white">{patch.to_version}</Mono></span>}
                actions={<>
                    {can('patch.publish') && (patch.status === 'draft' || patch.status === 'scheduled') && <><Button variant="secondary" icon={<CalendarClock className="size-4" />} onClick={() => setAction('schedule')}>زمان‌بندی</Button><Button icon={<Rocket className="size-4" />} onClick={() => setAction('publish')}>انتشار فوری</Button></>}
                    {can('patch.withdraw') && (patch.status === 'published' || patch.status === 'scheduled') && <Button variant="danger" icon={<Undo2 className="size-4" />} onClick={() => setAction('withdraw')}>لغو انتشار</Button>}
                </>}
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card>
                        <CardHeader title="پیشرفت استقرار" description={`${formatNumber(applied)} از ${formatNumber(statuses.length)} دستگاه اعمال شده`} />
                        <div className="flex items-center gap-6">
                            <Ring pct={pct} />
                            <div className="grid flex-1 grid-cols-3 gap-3">
                                <Stat label="اعمال‌شده" value={applied} tone="text-emerald-300" />
                                <Stat label="ناموفق" value={failed} tone="text-rose-300" />
                                <Stat label="در انتظار" value={statuses.length - applied - failed} tone="text-neutral-200" />
                            </div>
                        </div>
                    </Card>
                    <Card padded={false}>
                        <div className="p-5 pb-0"><CardHeader title="فایل‌های پچ" description={`${formatNumber(patch.files?.length ?? 0)} فایل`} action={<FileText className="size-5 text-neutral-500" />} /></div>
                        <DataTable columns={fileCols} rows={patch.files ?? []} rowKey={(f) => f.id} emptyTitle="بدون فایل" dense />
                    </Card>
                    <Card padded={false}>
                        <div className="p-5 pb-0"><CardHeader title="وضعیت دستگاه‌ها" action={<Package className="size-5 text-neutral-500" />} /></div>
                        <DataTable columns={devCols} rows={statuses} rowKey={(s) => s.id} emptyTitle="هنوز به دستگاهی ارائه نشده" dense />
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="مشخصات" />
                        <KeyValue columns={1} items={[
                            { label: 'هدف', value: <>{patchTargetType[patch.target_type]}{patch.target_type === 'plans' && <span className="text-neutral-500"> — {patch.target_plans?.map((p) => p.name).join('، ')}</span>}{patch.target_type === 'licenses' && <span className="text-neutral-500"> — {formatNumber(patch.target_licenses?.length ?? 0)} لایسنس</span>}</> },
                            { label: 'نوع', value: patch.type ?? '—' },
                            { label: 'فایل', value: <span dir="ltr">{patch.file_name} ({formatBytes(patch.file_size)})</span> },
                            { label: 'SHA-256', value: patch.file_sha256 ?? '—', mono: true },
                            { label: 'کلید امضا (kid)', value: patch.signing_kid ?? '—', mono: true },
                            { label: 'آپلود', value: `${patch.uploader?.name ?? '—'} · ${formatDate(patch.created_at)}` },
                            { label: 'انتشار', value: formatDate(patch.published_at) },
                            { label: 'زمان‌بندی', value: formatDate(patch.scheduled_at) },
                            { label: 'لغو', value: formatDate(patch.withdrawn_at) },
                        ]} />
                        {patch.description && <p className="mt-4 border-t border-white/[.06] pt-4 text-sm leading-6 text-neutral-400">{patch.description}</p>}
                    </Card>
                    {(patch.scripts?.length ?? 0) > 0 && (
                        <Card><CardHeader title="اسکریپت‌ها" action={<FileCode2 className="size-5 text-neutral-500" />} />
                            <ol className="space-y-2">{patch.scripts!.map((s) => <li key={s.id} className="flex items-center gap-3 rounded-lg bg-white/[.03] px-3 py-2 text-xs"><span className="grid size-5 place-items-center rounded bg-white/10 font-mono text-[10px]">{s.order_no}</span><Mono>{s.file_name}</Mono></li>)}</ol>
                        </Card>
                    )}
                    {(patch.dependencies?.length ?? 0) > 0 && (
                        <Card><CardHeader title="وابستگی‌ها" action={<Link2 className="size-5 text-neutral-500" />} />
                            <ul className="space-y-2">{patch.dependencies!.map((d) => <li key={d.id}><Link href={route('admin.patches.show', d.patch_code)} className="flex items-center justify-between rounded-lg bg-white/[.03] px-3 py-2 text-xs hover:bg-white/[.06]"><span className="text-neutral-200">{d.title}</span><Mono className="text-amber-200/80">{d.patch_code}</Mono></Link></li>)}</ul>
                        </Card>
                    )}
                    <Card><CardHeader title="امضا" action={<Fingerprint className="size-5 text-neutral-500" />} />
                        <p className="text-xs leading-6 text-neutral-400">این پچ با الگوریتم <span className="font-mono text-neutral-200">Ed25519</span> امضا شده است. کلاینت قبل از اعمال، امضا و SHA-256 هر فایل را با کلید عمومی سرور بررسی می‌کند.</p>
                    </Card>
                </div>
            </div>

            <ConfirmDialog open={action === 'publish'} onClose={() => setAction(null)} loading={busy} tone="primary" title="انتشار فوری پچ" description="پچ از heartbeat بعدی به همه دستگاه‌های واجد شرایط پیشنهاد می‌شود." confirmLabel="منتشر کن" onConfirm={() => post('admin.patches.publish')} />
            <ConfirmDialog open={action === 'withdraw'} onClose={() => setAction(null)} loading={busy} withReason title="لغو انتشار پچ" description="دستگاه‌هایی که هنوز دانلود نکرده‌اند دیگر این پچ را دریافت نمی‌کنند." confirmLabel="لغو انتشار" onConfirm={(reason) => post('admin.patches.withdraw', { reason })} />
            <ScheduleModal open={action === 'schedule'} onClose={() => setAction(null)} patch={patch} />
        </>
    );
}

PatchShow.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
    return <div className="rounded-xl bg-white/[.03] p-3 ring-1 ring-white/[.06]"><p className={cn('text-2xl font-bold tabular-nums', tone)}>{formatNumber(value)}</p><p className="text-[11px] text-neutral-500">{label}</p></div>;
}

function Ring({ pct }: { pct: number }) {
    const r = 40; const c = 2 * Math.PI * r;
    return (
        <div className="relative size-28 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="9" />
                <motion.circle cx="50" cy="50" r={r} fill="none" stroke="#34d399" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (pct / 100) * c }} transition={{ duration: 1.4, ease: EASE_OUT_EXPO, delay: 0.2 }} />
            </svg>
            <div className="absolute inset-0 grid place-items-center"><span className="text-xl font-bold text-white">{formatNumber(pct)}٪</span></div>
        </div>
    );
}

function ScheduleModal({ open, onClose, patch }: { open: boolean; onClose: () => void; patch: Patch }) {
    const form = useForm({ scheduled_at: patch.scheduled_at ? patch.scheduled_at.slice(0, 16) : '' });
    const submit = (e: FormEvent) => { e.preventDefault(); form.transform((d) => ({ scheduled_at: new Date(d.scheduled_at).toISOString() })); form.post(route('admin.patches.schedule', patch.patch_code), { preserveScroll: true, onSuccess: onClose }); };
    return (
        <Modal open={open} onClose={onClose} size="sm" title="زمان‌بندی انتشار" description="پچ در زمان تعیین‌شده (بر اساس ساعت سرور، UTC) به‌صورت خودکار منتشر می‌شود."
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="sched-form" type="submit" loading={form.processing} icon={<CalendarClock className="size-4" />}>ثبت زمان</Button></>}>
            <form id="sched-form" onSubmit={submit} className="py-2"><Field label="زمان انتشار" required error={form.errors.scheduled_at}><Input type="datetime-local" value={form.data.scheduled_at} onChange={(e) => form.setData('scheduled_at', e.target.value)} dir="ltr" min={new Date().toISOString().slice(0, 16)} /></Field></form>
        </Modal>
    );
}
