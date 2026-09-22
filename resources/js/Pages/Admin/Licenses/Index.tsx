import { Head, router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Filter, KeyRound, Plus, RotateCcw } from 'lucide-react';
import { type FormEvent } from 'react';
import { StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { Field, Select, Textarea } from '@/Components/ui/Field';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { SearchInput } from '@/Components/ui/SearchInput';
import { useCan } from '@/Hooks/useCan';
import { useDebouncedFilters } from '@/Hooks/useDebouncedFilters';
import { useDisclosure } from '@/Hooks/useDisclosure';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp } from '@/lib/motion';
import { durationType, licenseStatus } from '@/lib/status';
import { daysUntil, formatDate, isOnline, timeAgo } from '@/lib/utils';
import type { Customer, DurationType, License, LicenseStatus, PageProps, Paginated, Plan } from '@/types';

type Props = PageProps<{
    licenses: Paginated<License>;
    plans: Pick<Plan, 'id' | 'code' | 'name' | 'default_duration'>[];
    customers: Pick<Customer, 'id' | 'name'>[];
    filters: { q?: string; status?: string; plan_id?: string | number };
}>;

export default function LicensesIndex({ licenses, plans, customers, filters }: Props) {
    const { can } = useCan();
    const issue = useDisclosure();
    const { values, set, reset, isDirty } = useDebouncedFilters(route('admin.licenses.index'), {
        q: filters.q ?? '',
        status: filters.status ?? '',
        plan_id: filters.plan_id ? String(filters.plan_id) : '',
    });

    const columns: Column<License>[] = [
        {
            key: 'uuid',
            header: 'شناسه',
            render: (l) => (
                <div className="flex items-center gap-1">
                    <Mono className="text-amber-200/90">{l.uuid.slice(0, 8)}</Mono>
                    <CopyButton value={l.uuid} />
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'مشتری',
            render: (l) => (
                <div>
                    <p className="font-medium text-white">{l.customer?.name ?? '—'}</p>
                    <p className="text-xs text-neutral-500">{l.plan?.name} · {durationType[l.duration_type]}</p>
                </div>
            ),
        },
        { key: 'status', header: 'وضعیت', render: (l) => <StatusBadge status={l.status} map={licenseStatus} /> },
        {
            key: 'expires',
            header: 'انقضا',
            hideBelow: 'md',
            render: (l) => <ExpiryCell license={l} />,
        },
        {
            key: 'device',
            header: 'دستگاه',
            hideBelow: 'lg',
            render: (l) =>
                l.device ? (
                    <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${isOnline(l.device.last_heartbeat_at) ? 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60' : 'bg-neutral-600'}`} />
                        <div>
                            <Mono>{l.device.fingerprint.slice(0, 10)}</Mono>
                            <p className="text-[11px] text-neutral-500">v{l.device.app_version ?? '?'} · {timeAgo(l.device.last_heartbeat_at)}</p>
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-neutral-600">فعال نشده</span>
                ),
        },
        { key: 'created', header: 'صدور', hideBelow: 'xl', render: (l) => <span className="text-xs text-neutral-400">{formatDate(l.created_at, false)}</span> },
    ];

    return (
        <>
            <Head title="لایسنس‌ها" />
            <PageHeader
                title="لایسنس‌ها"
                description="مدیریت چرخه عمر لایسنس‌های صادرشده برای مشتریان"
                actions={
                    can('license.issue') && (
                        <Button icon={<Plus className="size-4" />} onClick={issue.onOpen}>
                            صدور لایسنس
                        </Button>
                    )
                }
            />

            <Card padded={false}>
                <motion.div variants={fadeUp} className="flex flex-col gap-3 border-b border-white/[.06] p-4 md:flex-row md:items-center">
                    <div className="flex-1">
                        <SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="جستجو بر اساس UUID، نام مشتری یا اثر انگشت دستگاه…" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="size-4 shrink-0 text-neutral-500" />
                        <Select value={values.status} onChange={(e) => set('status', e.target.value)} className="w-40">
                            <option value="">همه وضعیت‌ها</option>
                            {(Object.keys(licenseStatus) as LicenseStatus[]).map((s) => (
                                <option key={s} value={s}>
                                    {licenseStatus[s].label}
                                </option>
                            ))}
                        </Select>
                        <Select value={values.plan_id} onChange={(e) => set('plan_id', e.target.value)} className="w-40">
                            <option value="">همه پلن‌ها</option>
                            {plans.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </Select>
                        {isDirty && (
                            <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={reset}>
                                پاک‌کردن
                            </Button>
                        )}
                    </div>
                </motion.div>

                <DataTable
                    columns={columns}
                    rows={licenses.data}
                    rowKey={(l) => l.id}
                    onRowClick={(l) => router.visit(route('admin.licenses.show', l.uuid))}
                    emptyTitle="لایسنسی یافت نشد"
                    emptyDescription="با تغییر فیلترها دوباره جستجو کنید یا یک لایسنس جدید صادر کنید."
                />
                <div className="px-4 pb-4">
                    <Pagination paginator={licenses} />
                </div>
            </Card>

            <IssueLicenseModal open={issue.open} onClose={issue.onClose} plans={plans} customers={customers} />
        </>
    );
}

LicensesIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* -------------------------------- Helpers -------------------------------- */

export function ExpiryCell({ license }: { license: License }) {
    if (license.duration_type === 'permanent') return <span className="text-xs font-medium text-emerald-300">دائمی</span>;
    if (!license.expires_at) return <span className="text-xs text-neutral-600">—</span>;
    const d = daysUntil(license.expires_at);
    const tone = d === null ? '' : d < 0 ? 'text-rose-300' : d <= 14 ? 'text-amber-300' : 'text-neutral-300';
    return (
        <div>
            <p className={`text-sm ${tone}`}>{formatDate(license.expires_at, false)}</p>
            {d !== null && <p className="text-[11px] text-neutral-500">{d < 0 ? `${Math.abs(d)} روز گذشته` : d === 0 ? 'امروز' : `${d} روز مانده`}</p>}
        </div>
    );
}

export function IssueLicenseModal({
    open,
    onClose,
    plans,
    customers,
    defaultCustomerId,
}: {
    open: boolean;
    onClose: () => void;
    plans: Pick<Plan, 'id' | 'code' | 'name' | 'default_duration'>[];
    customers: Pick<Customer, 'id' | 'name'>[];
    defaultCustomerId?: number;
}) {
    const form = useForm<{ customer_id: string; plan_id: string; duration_type: DurationType; note: string }>({
        customer_id: defaultCustomerId ? String(defaultCustomerId) : '',
        plan_id: plans[0] ? String(plans[0].id) : '',
        duration_type: plans[0]?.default_duration ?? 'yearly',
        note: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.licenses.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="صدور لایسنس جدید"
            description="لایسنس در وضعیت «فعال‌نشده» صادر می‌شود و با اولین فعال‌سازی به دستگاه قفل می‌گردد."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        انصراف
                    </Button>
                    <Button form="issue-license" type="submit" loading={form.processing} icon={<KeyRound className="size-4" />}>
                        صدور
                    </Button>
                </>
            }
        >
            <form id="issue-license" onSubmit={submit} className="space-y-4 py-2">
                <Field label="مشتری" required error={form.errors.customer_id}>
                    <Select value={form.data.customer_id} onChange={(e) => form.setData('customer_id', e.target.value)} invalid={!!form.errors.customer_id} disabled={!!defaultCustomerId}>
                        <option value="">انتخاب مشتری…</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="پلن" required error={form.errors.plan_id}>
                        <Select
                            value={form.data.plan_id}
                            onChange={(e) => {
                                const p = plans.find((x) => String(x.id) === e.target.value);
                                form.setData({ ...form.data, plan_id: e.target.value, duration_type: p?.default_duration ?? form.data.duration_type });
                            }}
                            invalid={!!form.errors.plan_id}
                        >
                            {plans.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="مدت" required error={form.errors.duration_type}>
                        <Select value={form.data.duration_type} onChange={(e) => form.setData('duration_type', e.target.value as DurationType)}>
                            {(Object.keys(durationType) as DurationType[]).map((d) => (
                                <option key={d} value={d}>
                                    {durationType[d]}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>
                <Field label="یادداشت" error={form.errors.note}>
                    <Textarea rows={2} value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} maxLength={500} placeholder="اختیاری — مثلاً شماره فاکتور" />
                </Field>
            </form>
        </Modal>
    );
}
