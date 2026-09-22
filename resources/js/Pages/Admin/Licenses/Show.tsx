import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Ban, CalendarClock, Check, Cpu, History, MonitorSmartphone, PauseCircle, PlayCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Badge, StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { Field, Select, Textarea } from '@/Components/ui/Field';
import { KeyValue } from '@/Components/ui/KeyValue';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { useCan } from '@/Hooks/useCan';
import AdminLayout from '@/Layouts/AdminLayout';
import { EASE_OUT_EXPO, listItem, stagger } from '@/lib/motion';
import { durationType, licenseStatus } from '@/lib/status';
import { cn, daysUntil, formatDate, isOnline, timeAgo } from '@/lib/utils';
import type { DurationType, GameshopModule, License, PageProps, Plan } from '@/types';

type Props = PageProps<{
    license: License & { plan?: Plan & { modules?: Pick<GameshopModule, 'id' | 'key' | 'title'>[] } };
    entitlements: string[];
    modules: Pick<GameshopModule, 'id' | 'key' | 'title' | 'is_core'>[];
    plans?: Pick<Plan, 'id' | 'code' | 'name'>[];
}>;

type Action = 'renew' | 'change-plan' | 'suspend' | 'reactivate' | 'revoke' | null;

export default function LicenseShow({ license, entitlements, modules, plans = [] }: Props) {
    const { can } = useCan();
    const [action, setAction] = useState<Action>(null);
    const [busy, setBusy] = useState(false);
    const d = daysUntil(license.expires_at);

    const post = (name: string, data: Record<string, string | number | boolean | null | undefined> = {}) => {
        setBusy(true);
        router.post(route(name, license.uuid), data, {
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                setAction(null);
            },
        });
    };

    return (
        <>
            <Head title={`لایسنس ${license.uuid.slice(0, 8)}`} />
            <PageHeader
                breadcrumbs={[{ label: 'لایسنس‌ها', href: route('admin.licenses.index') }, { label: license.uuid.slice(0, 8) }]}
                title={
                    <span className="flex items-center gap-2">
                        <Mono className="text-xl text-white">{license.uuid}</Mono>
                        <CopyButton value={license.uuid} />
                    </span>
                }
                badge={<StatusBadge status={license.status} map={licenseStatus} />}
                description={
                    <>
                        صادرشده برای{' '}
                        <Link href={route('admin.customers.show', license.customer?.uuid ?? license.customer_id)} className="text-amber-300 hover:underline">
                            {license.customer?.name}
                        </Link>{' '}
                        · {formatDate(license.created_at)}
                    </>
                }
                actions={
                    <>
                        {can('license.renew') && license.status !== 'revoked' && (
                            <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={() => setAction('renew')}>
                                تمدید
                            </Button>
                        )}
                        {can('license.change_plan') && license.status !== 'revoked' && (
                            <Button variant="secondary" icon={<ArrowLeftRight className="size-4" />} onClick={() => setAction('change-plan')}>
                                تغییر پلن
                            </Button>
                        )}
                        {can('license.suspend') && license.status === 'active' && (
                            <Button variant="outline" icon={<PauseCircle className="size-4" />} onClick={() => setAction('suspend')}>
                                تعلیق
                            </Button>
                        )}
                        {can('license.suspend') && license.status === 'suspended' && (
                            <Button variant="success" icon={<PlayCircle className="size-4" />} onClick={() => setAction('reactivate')}>
                                فعال‌سازی مجدد
                            </Button>
                        )}
                        {can('license.revoke') && license.status !== 'revoked' && (
                            <Button variant="danger" icon={<Ban className="size-4" />} onClick={() => setAction('revoke')}>
                                ابطال
                            </Button>
                        )}
                    </>
                }
            />

            {/* alert banners */}
            <AnimatePresence>
                {license.status === 'suspended' && (
                    <Banner key="s" tone="warning" title="این لایسنس معلق است" text={license.suspend_reason ? `دلیل: ${license.suspend_reason}` : undefined} meta={formatDate(license.suspended_at)} />
                )}
                {license.status === 'revoked' && <Banner key="r" tone="danger" title="این لایسنس باطل شده و قابل بازگشت نیست" text={license.revoke_reason ? `دلیل: ${license.revoke_reason}` : undefined} meta={formatDate(license.revoked_at)} />}
                {license.status === 'active' && d !== null && d <= 14 && d >= 0 && <Banner key="e" tone="amber" title={`تنها ${d} روز تا انقضا باقی مانده`} text="برای جلوگیری از قفل‌شدن نرم‌افزار، لایسنس را تمدید کنید." />}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card>
                        <CardHeader title="مشخصات لایسنس" />
                        <KeyValue
                            columns={3}
                            items={[
                                { label: 'پلن', value: <Badge tone="amber">{license.plan?.name}</Badge> },
                                { label: 'نوع مدت', value: durationType[license.duration_type] },
                                { label: 'تاریخ فعال‌سازی', value: formatDate(license.activated_at) },
                                { label: 'تاریخ انقضا', value: license.duration_type === 'permanent' ? 'دائمی' : formatDate(license.expires_at) },
                                { label: 'آخرین مشاهده', value: license.last_seen_at ? `${timeAgo(license.last_seen_at)}` : '—' },
                                { label: 'یادداشت', value: license.note || '—' },
                            ]}
                        />
                    </Card>

                    {/* Device */}
                    <Card>
                        <CardHeader title="دستگاه متصل" description="هر لایسنس فقط به یک دستگاه قفل می‌شود" action={<MonitorSmartphone className="size-5 text-neutral-500" />} />
                        {license.device ? (
                            <div className="rounded-xl bg-white/[.03] p-4 ring-1 ring-white/[.06]">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={cn('relative flex size-2.5', isOnline(license.device.last_heartbeat_at) ? 'text-emerald-400' : 'text-neutral-600')}>
                                            {isOnline(license.device.last_heartbeat_at) && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />}
                                            <span className="relative inline-flex size-2.5 rounded-full bg-current" />
                                        </span>
                                        <span className="text-sm font-medium text-white">{license.device.hostname ?? 'دستگاه بدون نام'}</span>
                                        <span className="text-xs text-neutral-500">{isOnline(license.device.last_heartbeat_at) ? 'آنلاین' : `آخرین ضربان ${timeAgo(license.device.last_heartbeat_at)}`}</span>
                                    </div>
                                    <Link href={route('admin.devices.show', license.device.id)} className="text-xs text-amber-300 hover:underline">
                                        جزئیات دستگاه
                                    </Link>
                                </div>
                                <KeyValue
                                    columns={3}
                                    items={[
                                        { label: 'اثر انگشت', value: license.device.fingerprint, mono: true },
                                        { label: 'نسخه برنامه', value: license.device.app_version ?? '—', mono: true },
                                        { label: 'سیستم‌عامل', value: [license.device.os, license.device.os_version].filter(Boolean).join(' ') || '—' },
                                        { label: 'آخرین IP', value: license.device.last_ip ?? '—', mono: true },
                                        { label: 'اولین اتصال', value: formatDate(license.device.first_seen_at) },
                                        { label: 'CPU', value: license.device.cpu ?? '—' },
                                    ]}
                                />
                            </div>
                        ) : (
                            <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-neutral-500">هنوز هیچ دستگاهی این لایسنس را فعال نکرده است.</p>
                        )}
                    </Card>

                    {/* Modules / entitlements */}
                    <Card>
                        <CardHeader title="ماژول‌ها و استثناها" description="نتیجه نهایی = ماژول‌های هسته + ماژول‌های پلن ± استثناهای این لایسنس" action={<Cpu className="size-5 text-neutral-500" />} />
                        <motion.ul variants={stagger(0.04)} initial="hidden" animate="show" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {modules.map((m) => {
                                const enabled = entitlements.includes(m.key);
                                const override = license.module_overrides?.find((o) => o.module_id === m.id);
                                const inPlan = license.plan?.modules?.some((pm) => pm.id === m.id) ?? false;
                                return (
                                    <ModuleRow
                                        key={m.id}
                                        module={m}
                                        enabled={enabled}
                                        inPlan={inPlan}
                                        override={override?.enabled}
                                        canEdit={can('license.change_plan') && license.status !== 'revoked'}
                                        onToggle={(next) => post('admin.licenses.override', { module_id: m.id, enabled: next, reason: next ? 'فعال‌سازی دستی توسط ادمین' : 'غیرفعال‌سازی دستی توسط ادمین' })}
                                    />
                                );
                            })}
                        </motion.ul>
                    </Card>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="تاریخچه" action={<History className="size-5 text-neutral-500" />} />
                        {license.history?.length ? (
                            <motion.ol variants={stagger(0.06)} initial="hidden" animate="show" className="relative space-y-5 border-r border-white/[.08] pr-5">
                                {license.history.map((h) => (
                                    <motion.li key={h.id} variants={listItem} className="relative">
                                        <span className="absolute -right-[26px] top-1 grid size-3 place-items-center rounded-full bg-neutral-900 ring-2 ring-amber-400/70">
                                            <span className="size-1 rounded-full bg-amber-400" />
                                        </span>
                                        <p className="text-sm font-medium text-white">{historyLabel(h.action)}</p>
                                        <p className="mt-0.5 text-xs text-neutral-500">
                                            {h.from_plan?.code && h.to_plan?.code && h.from_plan.code !== h.to_plan.code && (
                                                <span className="ml-1 font-mono">
                                                    {h.from_plan.code} → {h.to_plan.code}
                                                </span>
                                            )}
                                            {h.to_expires_at && <span>تا {formatDate(h.to_expires_at, false)}</span>}
                                        </p>
                                        {h.note && <p className="mt-1 text-xs text-neutral-400">«{h.note}»</p>}
                                        <p className="mt-1 text-[11px] text-neutral-600">
                                            {h.performer?.name ?? 'سیستم'} · {timeAgo(h.created_at)}
                                        </p>
                                    </motion.li>
                                ))}
                            </motion.ol>
                        ) : (
                            <p className="text-sm text-neutral-500">تاریخچه‌ای ثبت نشده است.</p>
                        )}
                    </Card>
                </div>
            </div>

            {/* Dialogs */}
            <RenewModal open={action === 'renew'} onClose={() => setAction(null)} license={license} />
            <ChangePlanModal open={action === 'change-plan'} onClose={() => setAction(null)} license={license} plans={plans} />
            <ConfirmDialog
                open={action === 'suspend'}
                onClose={() => setAction(null)}
                onConfirm={(reason) => post('admin.licenses.suspend', { reason })}
                loading={busy}
                withReason
                title="تعلیق لایسنس"
                description="نرم‌افزار مشتری از اولین heartbeat بعدی قفل می‌شود. این عمل قابل بازگشت است."
                confirmLabel="تعلیق"
                tone="primary"
            />
            <ConfirmDialog
                open={action === 'reactivate'}
                onClose={() => setAction(null)}
                onConfirm={() => post('admin.licenses.reactivate')}
                loading={busy}
                title="فعال‌سازی مجدد"
                description="لایسنس به وضعیت فعال بازمی‌گردد و نرم‌افزار در heartbeat بعدی باز می‌شود."
                confirmLabel="فعال کن"
                tone="success"
            />
            <ConfirmDialog
                open={action === 'revoke'}
                onClose={() => setAction(null)}
                onConfirm={(reason) => post('admin.licenses.revoke', { reason })}
                loading={busy}
                withReason
                title="ابطال دائمی لایسنس"
                description="این عمل غیرقابل بازگشت است. توکن‌های صادرشده بی‌اعتبار می‌شوند و دستگاه دیگر قادر به فعال‌سازی نخواهد بود."
                confirmLabel="ابطال کن"
            />
        </>
    );
}

LicenseShow.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* -------------------------------------------------------------------------- */

function historyLabel(action: string): string {
    const map: Record<string, string> = {
        issue: 'صدور لایسنس',
        issued: 'صدور لایسنس',
        activate: 'فعال‌سازی روی دستگاه',
        activated: 'فعال‌سازی روی دستگاه',
        renew: 'تمدید',
        renewed: 'تمدید',
        change_plan: 'تغییر پلن',
        plan_changed: 'تغییر پلن',
        suspend: 'تعلیق',
        suspended: 'تعلیق',
        reactivate: 'فعال‌سازی مجدد',
        reactivated: 'فعال‌سازی مجدد',
        revoke: 'ابطال',
        revoked: 'ابطال',
        expire: 'انقضا',
        expired: 'انقضا',
        override: 'استثنای ماژول',
    };
    return map[action] ?? action;
}

function Banner({ tone, title, text, meta }: { tone: 'warning' | 'danger' | 'amber'; title: string; text?: string; meta?: string }) {
    const cls = {
        warning: 'bg-orange-500/10 ring-orange-500/25 text-orange-200',
        danger: 'bg-rose-500/10 ring-rose-500/25 text-rose-200',
        amber: 'bg-amber-500/10 ring-amber-500/25 text-amber-200',
    }[tone];
    return (
        <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }} className="mb-6 overflow-hidden">
            <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3 text-sm ring-1', cls)}>
                <CalendarClock className="size-4 shrink-0" />
                <span className="font-medium">{title}</span>
                {text && <span className="opacity-80">{text}</span>}
                {meta && <span className="mr-auto text-xs opacity-60">{meta}</span>}
            </div>
        </motion.div>
    );
}

function ModuleRow({ module, enabled, inPlan, override, canEdit, onToggle }: { module: Pick<GameshopModule, 'id' | 'key' | 'title' | 'is_core'>; enabled: boolean; inPlan: boolean; override?: boolean; canEdit: boolean; onToggle: (next: boolean) => void }) {
    return (
        <motion.li variants={listItem} className={cn('flex items-center justify-between gap-3 rounded-xl p-3 ring-1 transition-colors', enabled ? 'bg-emerald-500/[.05] ring-emerald-500/20' : 'bg-white/[.02] ring-white/[.06]')}>
            <div className="flex items-center gap-3">
                <span className={cn('grid size-8 place-items-center rounded-lg', enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[.05] text-neutral-500')}>{enabled ? <Check className="size-4" /> : <X className="size-4" />}</span>
                <div>
                    <p className="text-sm font-medium text-white">
                        {module.title}
                        {module.is_core && <span className="mr-2 rounded bg-white/10 px-1.5 text-[10px] text-neutral-300">هسته</span>}
                    </p>
                    <p className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <span className="font-mono">{module.key}</span>
                        {override !== undefined && (
                            <span className="flex items-center gap-1 text-amber-300">
                                <Sparkles className="size-3" /> استثنا: {override ? 'روشن' : 'خاموش'}
                            </span>
                        )}
                        {override === undefined && inPlan && <span>از پلن</span>}
                    </p>
                </div>
            </div>
            {canEdit && !module.is_core && (
                <Button size="xs" variant={enabled ? 'ghost' : 'secondary'} onClick={() => onToggle(!enabled)}>
                    {enabled ? 'غیرفعال' : 'فعال'}
                </Button>
            )}
        </motion.li>
    );
}

function RenewModal({ open, onClose, license }: { open: boolean; onClose: () => void; license: License }) {
    const form = useForm<{ duration_type: DurationType; note: string }>({ duration_type: license.duration_type === 'permanent' ? 'yearly' : license.duration_type, note: '' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.licenses.renew', license.uuid), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    };
    return (
        <Modal open={open} onClose={onClose} title="تمدید لایسنس" description="مدت جدید از تاریخ انقضای فعلی (یا امروز اگر منقضی شده) محاسبه می‌شود." size="sm"
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="renew-form" type="submit" loading={form.processing} icon={<RefreshCw className="size-4" />}>تمدید</Button></>}>
            <form id="renew-form" onSubmit={submit} className="space-y-4 py-2">
                <Field label="مدت تمدید" required error={form.errors.duration_type}>
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(durationType) as DurationType[]).map((d) => (
                            <button key={d} type="button" onClick={() => form.setData('duration_type', d)} className={cn('rounded-xl px-3 py-2.5 text-sm ring-1 transition-all', form.data.duration_type === d ? 'bg-amber-400 text-neutral-950 ring-amber-400' : 'bg-white/[.04] text-neutral-300 ring-white/10 hover:ring-white/25')}>
                                {durationType[d]}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="یادداشت" error={form.errors.note}>
                    <Textarea rows={2} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} maxLength={500} />
                </Field>
            </form>
        </Modal>
    );
}

function ChangePlanModal({ open, onClose, license, plans }: { open: boolean; onClose: () => void; license: License; plans: Pick<Plan, 'id' | 'code' | 'name'>[] }) {
    const form = useForm({ plan_id: String(license.plan_id), note: '' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.licenses.change-plan', license.uuid), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    };
    return (
        <Modal open={open} onClose={onClose} title="تغییر پلن" description="ماژول‌های در دسترس مشتری بلافاصله بر اساس پلن جدید محاسبه می‌شود." size="sm"
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="plan-form" type="submit" loading={form.processing} disabled={form.data.plan_id === String(license.plan_id)} icon={<ArrowLeftRight className="size-4" />}>اعمال</Button></>}>
            <form id="plan-form" onSubmit={submit} className="space-y-4 py-2">
                <Field label="پلن جدید" required error={form.errors.plan_id} hint={plans.length === 0 ? 'برای نمایش لیست پلن‌ها، prop `plans` را از LicenseController@show ارسال کنید.' : undefined}>
                    <Select value={form.data.plan_id} onChange={(e) => form.setData('plan_id', e.target.value)}>
                        {plans.length === 0 && <option value={license.plan_id}>{license.plan?.name}</option>}
                        {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.code})
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="یادداشت" error={form.errors.note}>
                    <Textarea rows={2} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} maxLength={500} />
                </Field>
            </form>
        </Modal>
    );
}
