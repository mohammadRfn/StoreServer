import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Fingerprint, Phone, Ticket, XCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { EmptyState } from '@/Components/ui/EmptyState';
import { Field, Select } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { Tabs } from '@/Components/ui/Tabs';
import { useCan } from '@/Hooks/useCan';
import AdminLayout from '@/Layouts/AdminLayout';
import { EASE_OUT_EXPO, listItem, stagger } from '@/lib/motion';
import { activationStatus, durationType } from '@/lib/status';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import type { ActivationRequest, ActivationStatus, Customer, DurationType, PageProps, Paginated, Plan } from '@/types';

type Props = PageProps<{
    requests: Paginated<ActivationRequest>;
    plans: Pick<Plan, 'id' | 'code' | 'name' | 'default_duration'>[];
    customers: Pick<Customer, 'id' | 'name'>[];
    filters: { status?: string };
}>;

export default function ActivationRequestsIndex({ requests, plans, customers, filters }: Props) {
    const { can } = useCan();
    const [approving, setApproving] = useState<ActivationRequest | null>(null);
    const [rejecting, setRejecting] = useState<ActivationRequest | null>(null);
    const [busy, setBusy] = useState(false);
    const status = (filters.status ?? '') as ActivationStatus | '';

    const setStatus = (s: string) => router.get(route('admin.activation-requests.index'), s ? { status: s } : {}, { preserveState: true, preserveScroll: true, replace: true });

    const reject = (reason?: string) => {
        if (!rejecting) return;
        setBusy(true);
        router.post(route('admin.activation-requests.reject', rejecting.uuid), { reason }, { preserveScroll: true, onFinish: () => { setBusy(false); setRejecting(null); } });
    };

    return (
        <>
            <Head title="درخواست‌های فعال‌سازی" />
            <PageHeader title="درخواست‌های فعال‌سازی" description="دستگاه‌هایی که بدون کد، درخواست فعال‌سازی ارسال کرده‌اند و منتظر تأیید هستند" />

            <motion.div variants={listItem} className="mb-4">
                <Tabs
                    id="ar-tabs"
                    value={status}
                    onChange={setStatus}
                    tabs={[
                        { value: '', label: 'همه' },
                        { value: 'pending', label: 'در انتظار' },
                        { value: 'approved', label: 'تأییدشده' },
                        { value: 'rejected', label: 'ردشده' },
                    ]}
                />
            </motion.div>

            {requests.data.length === 0 ? (
                <Card>
                    <EmptyState icon={<Ticket className="size-6" />} title="درخواستی وجود ندارد" description="وقتی کاربری در نرم‌افزار GameShop درخواست فعال‌سازی ارسال کند، اینجا نمایش داده می‌شود." />
                </Card>
            ) : (
                <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                        {requests.data.map((r) => (
                            <RequestCard key={r.id} request={r} canReview={can('license.approve')} onApprove={() => setApproving(r)} onReject={() => setRejecting(r)} />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
            <Pagination paginator={requests} className="mt-2" />

            <ApproveModal request={approving} onClose={() => setApproving(null)} plans={plans} customers={customers} />
            <ConfirmDialog open={!!rejecting} onClose={() => setRejecting(null)} onConfirm={reject} loading={busy} withReason title="رد درخواست فعال‌سازی" description="کاربر در heartbeat بعدی پیام رد را دریافت می‌کند." confirmLabel="رد کن" />
        </>
    );
}

ActivationRequestsIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* -------------------------------------------------------------------------- */

function RequestCard({ request: r, canReview, onApprove, onReject }: { request: ActivationRequest; canReview: boolean; onApprove: () => void; onReject: () => void }) {
    const pending = r.status === 'pending';
    const sys = r.system_info ?? {};
    return (
        <motion.div layout variants={listItem} exit={{ opacity: 0, scale: 0.96 }} whileHover={{ y: -2 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO }} className={cn('relative overflow-hidden rounded-2xl bg-neutral-900/70 p-5 ring-1', pending ? 'ring-amber-400/25' : 'ring-white/[.07]')}>
            {pending && <div className="pointer-events-none absolute -top-16 -left-16 size-48 rounded-full bg-amber-400/10 blur-3xl" />}
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-white">{r.customer_name || 'بدون نام'}</h3>
                        <StatusBadge status={r.status} map={activationStatus} size="sm" />
                    </div>
                    {r.customer_phone && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
                            <Phone className="size-3" /> <span dir="ltr">{r.customer_phone}</span>
                        </p>
                    )}
                </div>
                <span className="text-[11px] text-neutral-500">{timeAgo(r.created_at)}</span>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2 flex items-center gap-2 rounded-lg bg-white/[.03] px-3 py-2">
                    <Fingerprint className="size-3.5 text-neutral-500" />
                    <Mono className="truncate">{r.fingerprint}</Mono>
                    <CopyButton value={r.fingerprint} className="mr-auto" />
                </div>
                <Info label="نسخه برنامه" value={r.app_version ?? '—'} mono />
                <Info label="IP درخواست" value={r.request_ip ?? '—'} mono />
                {typeof sys.hostname === 'string' && <Info label="نام دستگاه" value={sys.hostname} />}
                {typeof sys.os === 'string' && <Info label="سیستم‌عامل" value={sys.os} />}
            </div>

            {!pending && (
                <div className="relative mt-4 rounded-lg bg-white/[.02] px-3 py-2 text-xs text-neutral-400 ring-1 ring-white/[.05]">
                    {r.status === 'approved' && r.license && (
                        <>
                            لایسنس <Mono className="text-emerald-300">{r.license.uuid.slice(0, 8)}</Mono> صادر شد
                        </>
                    )}
                    {r.status === 'rejected' && <>رد شد{r.reject_reason && `: ${r.reject_reason}`}</>}
                    <span className="mr-2 text-neutral-600">
                        · {r.reviewer?.name ?? 'سیستم'} · {formatDate(r.reviewed_at)}
                    </span>
                </div>
            )}

            {pending && canReview && (
                <div className="relative mt-4 flex gap-2">
                    <Button block variant="success" size="sm" icon={<CheckCircle2 className="size-4" />} onClick={onApprove}>
                        تأیید و صدور لایسنس
                    </Button>
                    <Button variant="danger" size="sm" icon={<XCircle className="size-4" />} onClick={onReject}>
                        رد
                    </Button>
                </div>
            )}
        </motion.div>
    );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="rounded-lg bg-white/[.03] px-3 py-2">
            <p className="text-[10px] text-neutral-500">{label}</p>
            <p className={cn('mt-0.5 truncate text-neutral-200', mono && 'font-mono')} dir={mono ? 'ltr' : undefined}>
                {value}
            </p>
        </div>
    );
}

function ApproveModal({ request, onClose, plans, customers }: { request: ActivationRequest | null; onClose: () => void; plans: Props['plans']; customers: Props['customers'] }) {
    const form = useForm<{ customer_id: string; plan_id: string; duration_type: DurationType }>({
        customer_id: '',
        plan_id: plans[0] ? String(plans[0].id) : '',
        duration_type: plans[0]?.default_duration ?? 'yearly',
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!request) return;
        form.post(route('admin.activation-requests.approve', request.uuid), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    };
    return (
        <Modal open={!!request} onClose={onClose} title="تأیید درخواست و صدور لایسنس" description={request ? `دستگاه ${request.fingerprint.slice(0, 12)}… بلافاصله فعال می‌شود.` : undefined}
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="approve-form" type="submit" variant="success" loading={form.processing} icon={<CheckCircle2 className="size-4" />}>تأیید و صدور</Button></>}>
            <form id="approve-form" onSubmit={submit} className="space-y-4 py-2">
                <Field label="مشتری" required error={form.errors.customer_id} hint={request?.customer_name ? `نام اعلام‌شده در درخواست: ${request.customer_name}` : undefined}>
                    <Select value={form.data.customer_id} onChange={(e) => form.setData('customer_id', e.target.value)} invalid={!!form.errors.customer_id}>
                        <option value="">انتخاب مشتری…</option>
                        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="پلن" required error={form.errors.plan_id}>
                        <Select value={form.data.plan_id} onChange={(e) => { const p = plans.find((x) => String(x.id) === e.target.value); form.setData({ ...form.data, plan_id: e.target.value, duration_type: p?.default_duration ?? form.data.duration_type }); }}>
                            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </Field>
                    <Field label="مدت" required error={form.errors.duration_type}>
                        <Select value={form.data.duration_type} onChange={(e) => form.setData('duration_type', e.target.value as DurationType)}>
                            {(Object.keys(durationType) as DurationType[]).map((d) => <option key={d} value={d}>{durationType[d]}</option>)}
                        </Select>
                    </Field>
                </div>
            </form>
        </Modal>
    );
}
