import { Head, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Building2, KeyRound, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { CustomerFormModal } from '@/Components/CustomerFormModal';
import { Avatar } from '@/Components/ui/Avatar';
import { StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { Select } from '@/Components/ui/Field';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { SearchInput } from '@/Components/ui/SearchInput';
import { useCan } from '@/Hooks/useCan';
import { useDebouncedFilters } from '@/Hooks/useDebouncedFilters';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp } from '@/lib/motion';
import { customerStatus } from '@/lib/status';
import { formatDate, formatNumber } from '@/lib/utils';
import type { Customer, PageProps, Paginated } from '@/types';

type Props = PageProps<{ customers: Paginated<Customer>; filters: { q?: string; status?: string } }>;

export default function CustomersIndex({ customers, filters }: Props) {
    const { can } = useCan();
    const [editing, setEditing] = useState<Customer | null | undefined>(undefined); // undefined=closed, null=create
    const [deleting, setDeleting] = useState<Customer | null>(null);
    const [busy, setBusy] = useState(false);
    const { values, set } = useDebouncedFilters(route('admin.customers.index'), { q: filters.q ?? '', status: filters.status ?? '' });

    const columns: Column<Customer>[] = [
        {
            key: 'name', header: 'مشتری',
            render: (c) => (
                <div className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <div>
                        <p className="font-medium text-white">{c.name}</p>
                        {c.company && <p className="flex items-center gap-1 text-xs text-neutral-500"><Building2 className="size-3" />{c.company}</p>}
                    </div>
                </div>
            ),
        },
        { key: 'contact', header: 'تماس', hideBelow: 'md', render: (c) => <div className="text-xs"><p className="text-neutral-300" dir="ltr">{c.phone ?? '—'}</p><p className="text-neutral-500" dir="ltr">{c.email ?? ''}</p></div> },
        { key: 'loc', header: 'موقعیت', hideBelow: 'lg', render: (c) => <span className="text-xs text-neutral-400">{[c.province, c.city].filter(Boolean).join('، ') || '—'}</span> },
        { key: 'status', header: 'وضعیت', render: (c) => <StatusBadge status={c.status} map={customerStatus} size="sm" /> },
        { key: 'lic', header: 'لایسنس‌ها', hideBelow: 'sm', render: (c) => <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-neutral-300"><KeyRound className="size-3.5 text-neutral-500" />{formatNumber(c.licenses_count ?? 0)}</span> },
        { key: 'created', header: 'ثبت', hideBelow: 'xl', render: (c) => <span className="text-xs text-neutral-400">{formatDate(c.created_at, false)}</span> },
        {
            key: 'actions', header: '', className: 'text-left',
            render: (c) => can('customer.manage') && (
                <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="xs" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={(e) => { e.stopPropagation(); setEditing(c); }} />
                    <Button size="xs" variant="ghost" className="text-rose-300 hover:bg-rose-500/10" icon={<Trash2 className="size-3.5" />} disabled={(c.licenses_count ?? 0) > 0} onClick={(e) => { e.stopPropagation(); setDeleting(c); }} />
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="مشتریان" />
            <PageHeader title="مشتریان" description={`${formatNumber(customers.total)} مشتری ثبت‌شده`} actions={can('customer.manage') && <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>مشتری جدید</Button>} />
            <Card padded={false}>
                <motion.div variants={fadeUp} className="flex flex-col gap-3 border-b border-white/[.06] p-4 md:flex-row">
                    <div className="flex-1"><SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="نام، شرکت، تلفن یا ایمیل…" /></div>
                    <Select value={values.status} onChange={(e) => set('status', e.target.value)} className="md:w-44"><option value="">همه وضعیت‌ها</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></Select>
                </motion.div>
                <DataTable columns={columns} rows={customers.data} rowKey={(c) => c.id} onRowClick={(c) => router.visit(route('admin.customers.show', c.uuid))} emptyTitle="مشتری‌ای یافت نشد" emptyAction={can('customer.manage') && <Button variant="secondary" icon={<UserPlus className="size-4" />} onClick={() => setEditing(null)}>ثبت اولین مشتری</Button>} />
                <div className="px-4 pb-4"><Pagination paginator={customers} /></div>
            </Card>

            <CustomerFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} customer={editing ?? null} />
            <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} loading={busy} title={`حذف «${deleting?.name}»`} description="فقط مشتریان بدون لایسنس قابل حذف هستند. این عمل قابل بازگشت نیست." confirmLabel="حذف"
                onConfirm={() => { if (!deleting) return; setBusy(true); router.delete(route('admin.customers.destroy', deleting.uuid), { preserveScroll: true, onFinish: () => { setBusy(false); setDeleting(null); } }); }} />
        </>
    );
}

CustomersIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
