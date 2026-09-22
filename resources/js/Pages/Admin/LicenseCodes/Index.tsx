import { Head, router, useForm, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Check, Copy, Plus, ShieldHalf, Sparkles } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { Mono } from '@/Components/ui/CopyButton';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { Field, Input, Select } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { Tabs } from '@/Components/ui/Tabs';
import { useCan } from '@/Hooks/useCan';
import { useDisclosure } from '@/Hooks/useDisclosure';
import AdminLayout from '@/Layouts/AdminLayout';
import { listItem, stagger } from '@/lib/motion';
import { codeStatus, durationType } from '@/lib/status';
import { copyToClipboard, formatDate, timeAgo } from '@/lib/utils';
import type { CodeStatus, Customer, DurationType, LicenseCode, PageProps, Paginated, Plan } from '@/types';

type Props = PageProps<{
    codes: Paginated<LicenseCode>;
    plans: Pick<Plan, 'id' | 'code' | 'name' | 'default_duration'>[];
    customers: Pick<Customer, 'id' | 'name'>[];
    filters: { status?: string };
}>;

export default function LicenseCodesIndex({ codes, plans, customers, filters }: Props) {
    const { can } = useCan();
    const { flash } = usePage<PageProps>().props;
    const gen = useDisclosure();
    const [revoking, setRevoking] = useState<LicenseCode | null>(null);
    const [busy, setBusy] = useState(false);
    const [plainCodes, setPlainCodes] = useState<string[]>([]);
    const status = (filters.status ?? '') as CodeStatus | '';

    // codes are shown only once (flash) – keep them until dismissed
    useEffect(() => {
        if (flash?.plain_codes?.length) setPlainCodes(flash.plain_codes);
    }, [flash?.plain_codes]);

    const setStatus = (s: string) => router.get(route('admin.license-codes.index'), s ? { status: s } : {}, { preserveState: true, preserveScroll: true, replace: true });

    const columns: Column<LicenseCode>[] = [
        { key: 'prefix', header: 'کد', render: (c) => <Mono className="text-amber-200">{c.code_prefix}-••••-••••-••••</Mono> },
        { key: 'status', header: 'وضعیت', render: (c) => <StatusBadge status={c.status} map={codeStatus} /> },
        { key: 'plan', header: 'پلن / مدت', render: (c) => <span className="text-sm">{c.plan?.name} <span className="text-neutral-500">· {durationType[c.duration_type]}</span></span> },
        { key: 'customer', header: 'مشتری', hideBelow: 'md', render: (c) => c.customer?.name ?? <span className="text-neutral-600">آزاد</span> },
        { key: 'expires', header: 'انقضای کد', hideBelow: 'lg', render: (c) => <span className="text-xs text-neutral-400">{formatDate(c.expires_at, false)}</span> },
        {
            key: 'used',
            header: 'استفاده',
            hideBelow: 'lg',
            render: (c) => c.used_at ? <span className="text-xs text-neutral-400">{timeAgo(c.used_at)}{c.license && <> · <Mono>{c.license.uuid.slice(0, 8)}</Mono></>}</span> : <span className="text-xs text-neutral-600">—</span>,
        },
        { key: 'creator', header: 'سازنده', hideBelow: 'xl', render: (c) => <span className="text-xs text-neutral-400">{c.creator?.name ?? '—'}</span> },
        {
            key: 'actions',
            header: '',
            className: 'text-left',
            render: (c) => c.status === 'active' && can('license.issue') && (
                <Button size="xs" variant="ghost" className="text-rose-300 hover:bg-rose-500/10" icon={<Ban className="size-3.5" />} onClick={() => setRevoking(c)}>ابطال</Button>
            ),
        },
    ];

    return (
        <>
            <Head title="کدهای یک‌بارمصرف" />
            <PageHeader title="کدهای یک‌بارمصرف" description="کدهای فعال‌سازی که مشتری در نرم‌افزار وارد می‌کند تا لایسنس بدون تأیید دستی صادر شود" actions={can('license.issue') && <Button icon={<Plus className="size-4" />} onClick={gen.onOpen}>تولید کد</Button>} />

            <AnimatePresence>
                {plainCodes.length > 0 && <PlainCodesPanel codes={plainCodes} onDismiss={() => setPlainCodes([])} />}
            </AnimatePresence>

            <motion.div variants={listItem} className="mb-4">
                <Tabs id="codes-tabs" value={status} onChange={setStatus} tabs={[{ value: '', label: 'همه' }, { value: 'active', label: 'قابل استفاده' }, { value: 'used', label: 'استفاده‌شده' }, { value: 'expired', label: 'منقضی' }, { value: 'revoked', label: 'باطل‌شده' }]} />
            </motion.div>

            <Card padded={false}>
                <DataTable columns={columns} rows={codes.data} rowKey={(c) => c.id} emptyTitle="کدی وجود ندارد" />
                <div className="px-4 pb-4"><Pagination paginator={codes} /></div>
            </Card>

            <GenerateModal open={gen.open} onClose={gen.onClose} plans={plans} customers={customers} />
            <ConfirmDialog open={!!revoking} onClose={() => setRevoking(null)} loading={busy} title="ابطال کد" description="این کد دیگر قابل استفاده نخواهد بود." confirmLabel="ابطال"
                onConfirm={() => { if (!revoking) return; setBusy(true); router.post(route('admin.license-codes.revoke', revoking.id), {}, { preserveScroll: true, onFinish: () => { setBusy(false); setRevoking(null); } }); }} />
        </>
    );
}

LicenseCodesIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* -------------------------------------------------------------------------- */

function PlainCodesPanel({ codes, onDismiss }: { codes: string[]; onDismiss: () => void }) {
    const [copiedAll, setCopiedAll] = useState(false);
    return (
        <motion.div initial={{ opacity: 0, y: -12, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -12, height: 0 }} className="mb-5 overflow-hidden">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400/15 via-neutral-900 to-neutral-900 p-5 ring-1 ring-amber-400/30">
                <motion.div className="pointer-events-none absolute -top-20 -right-20 size-60 rounded-full bg-amber-400/20 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} />
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-base font-semibold text-white"><Sparkles className="size-4 text-amber-300" /> کدها ساخته شدند — فقط همین یک‌بار نمایش داده می‌شوند</h3>
                        <p className="mt-1 text-xs text-amber-200/70">کدها به‌صورت هش ذخیره شده‌اند و پس از بستن این پنل قابل بازیابی نیستند. حتماً کپی کنید.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" icon={copiedAll ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />} onClick={async () => { if (await copyToClipboard(codes.join('\n'))) { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1500); } }}>کپی همه</Button>
                        <Button size="sm" variant="ghost" onClick={onDismiss}>بستن</Button>
                    </div>
                </div>
                <motion.ul variants={stagger(0.06)} initial="hidden" animate="show" className="relative mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {codes.map((c) => <CodeChip key={c} code={c} />)}
                </motion.ul>
            </div>
        </motion.div>
    );
}

function CodeChip({ code }: { code: string }) {
    const [ok, setOk] = useState(false);
    return (
        <motion.li variants={listItem}>
            <button onClick={async () => { if (await copyToClipboard(code)) { setOk(true); setTimeout(() => setOk(false), 1500); } }} className="flex w-full items-center justify-between rounded-xl bg-neutral-950/60 px-4 py-3 ring-1 ring-white/10 transition hover:ring-amber-400/50">
                <Mono className="text-base font-semibold tracking-widest text-white">{code}</Mono>
                {ok ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4 text-neutral-500" />}
            </button>
        </motion.li>
    );
}

function GenerateModal({ open, onClose, plans, customers }: { open: boolean; onClose: () => void; plans: Props['plans']; customers: Props['customers'] }) {
    const form = useForm<{ plan_id: string; duration_type: DurationType; customer_id: string; ttl_days: string; count: number }>({
        plan_id: plans[0] ? String(plans[0].id) : '',
        duration_type: plans[0]?.default_duration ?? 'yearly',
        customer_id: '',
        ttl_days: '30',
        count: 1,
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, customer_id: d.customer_id || null, ttl_days: d.ttl_days ? Number(d.ttl_days) : null }));
        form.post(route('admin.license-codes.store'), { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    };
    return (
        <Modal open={open} onClose={onClose} title="تولید کد یک‌بارمصرف" description="فرمت: GS-XXXX-XXXX-XXXX-XXXX — تا ۵۰ کد در هر بار"
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="gen-form" type="submit" loading={form.processing} icon={<ShieldHalf className="size-4" />}>تولید {form.data.count > 1 ? `${form.data.count} کد` : 'کد'}</Button></>}>
            <form id="gen-form" onSubmit={submit} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="پلن" required error={form.errors.plan_id}>
                        <Select value={form.data.plan_id} onChange={(e) => { const p = plans.find((x) => String(x.id) === e.target.value); form.setData({ ...form.data, plan_id: e.target.value, duration_type: p?.default_duration ?? form.data.duration_type }); }}>
                            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                    </Field>
                    <Field label="مدت لایسنس" required error={form.errors.duration_type}>
                        <Select value={form.data.duration_type} onChange={(e) => form.setData('duration_type', e.target.value as DurationType)}>
                            {(Object.keys(durationType) as DurationType[]).map((d) => <option key={d} value={d}>{durationType[d]}</option>)}
                        </Select>
                    </Field>
                </div>
                <Field label="مشتری (اختیاری)" error={form.errors.customer_id} hint="اگر خالی بماند، کد آزاد است و مشتری هنگام فعال‌سازی ساخته می‌شود.">
                    <Select value={form.data.customer_id} onChange={(e) => form.setData('customer_id', e.target.value)}>
                        <option value="">— بدون مشتری —</option>
                        {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="اعتبار کد (روز)" error={form.errors.ttl_days}>
                        <Input type="number" min={1} max={3650} value={form.data.ttl_days} onChange={(e) => form.setData('ttl_days', e.target.value)} dir="ltr" />
                    </Field>
                    <Field label="تعداد" error={form.errors.count}>
                        <Input type="number" min={1} max={50} value={form.data.count} onChange={(e) => form.setData('count', Math.max(1, Math.min(50, Number(e.target.value))))} dir="ltr" />
                    </Field>
                </div>
            </form>
        </Modal>
    );
}
