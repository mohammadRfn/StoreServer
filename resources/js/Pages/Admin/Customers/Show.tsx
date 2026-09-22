import { Head, router } from '@inertiajs/react';
import { KeyRound, Mail, MapPin, Pencil, Phone, Plus } from 'lucide-react';
import { useState } from 'react';
import { CustomerFormModal } from '@/Components/CustomerFormModal';
import { Avatar } from '@/Components/ui/Avatar';
import { StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { KeyValue } from '@/Components/ui/KeyValue';
import { PageHeader } from '@/Components/ui/PageHeader';
import { useCan } from '@/Hooks/useCan';
import AdminLayout from '@/Layouts/AdminLayout';
import { customerStatus, durationType, licenseStatus } from '@/lib/status';
import { formatDate, formatNumber } from '@/lib/utils';
import { ExpiryCell, IssueLicenseModal } from '@/Pages/Admin/Licenses/Index';
import type { Customer, License, PageProps, Plan } from '@/types';

type Props = PageProps<{ customer: Customer; plans?: Pick<Plan, 'id' | 'code' | 'name' | 'default_duration'>[] }>;

export default function CustomerShow({ customer, plans = [] }: Props) {
    const { can } = useCan();
    const [edit, setEdit] = useState(false);
    const [issue, setIssue] = useState(false);
    const licenses = customer.licenses ?? [];
    const active = licenses.filter((l) => l.status === 'active').length;

    const columns: Column<License>[] = [
        { key: 'uuid', header: 'شناسه', render: (l) => <div className="flex items-center gap-1"><Mono className="text-amber-200">{l.uuid.slice(0, 8)}</Mono><CopyButton value={l.uuid} /></div> },
        { key: 'plan', header: 'پلن', render: (l) => <span>{l.plan?.name} <span className="text-xs text-neutral-500">· {durationType[l.duration_type]}</span></span> },
        { key: 'status', header: 'وضعیت', render: (l) => <StatusBadge status={l.status} map={licenseStatus} size="sm" /> },
        { key: 'exp', header: 'انقضا', hideBelow: 'md', render: (l) => <ExpiryCell license={l} /> },
        { key: 'dev', header: 'دستگاه', hideBelow: 'lg', render: (l) => l.device ? <Mono>{l.device.fingerprint.slice(0, 12)} · v{l.device.app_version}</Mono> : <span className="text-xs text-neutral-600">—</span> },
    ];

    return (
        <>
            <Head title={customer.name} />
            <PageHeader
                breadcrumbs={[{ label: 'مشتریان', href: route('admin.customers.index') }, { label: customer.name }]}
                title={<span className="flex items-center gap-3"><Avatar name={customer.name} size="lg" />{customer.name}</span>}
                badge={<StatusBadge status={customer.status} map={customerStatus} />}
                description={customer.company}
                actions={<>
                    {can('customer.manage') && <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEdit(true)}>ویرایش</Button>}
                    {can('license.issue') && <Button icon={<Plus className="size-4" />} onClick={() => setIssue(true)}>صدور لایسنس</Button>}
                </>}
            />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="اطلاعات تماس" />
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center gap-3 text-neutral-300"><Phone className="size-4 text-neutral-500" /><span dir="ltr">{customer.phone ?? '—'}</span></li>
                            <li className="flex items-center gap-3 text-neutral-300"><Mail className="size-4 text-neutral-500" /><span dir="ltr">{customer.email ?? '—'}</span></li>
                            <li className="flex items-start gap-3 text-neutral-300"><MapPin className="mt-0.5 size-4 shrink-0 text-neutral-500" /><span>{[customer.province, customer.city, customer.address].filter(Boolean).join('، ') || '—'}</span></li>
                        </ul>
                        <div className="mt-5 border-t border-white/[.06] pt-4">
                            <KeyValue columns={1} items={[{ label: 'شناسه', value: customer.uuid, mono: true }, { label: 'کد ملی', value: customer.national_id ?? '—', mono: true }, { label: 'تاریخ ثبت', value: formatDate(customer.created_at) }]} />
                        </div>
                    </Card>
                    {customer.notes && <Card><CardHeader title="یادداشت داخلی" /><p className="whitespace-pre-wrap text-sm leading-7 text-neutral-300">{customer.notes}</p></Card>}
                </div>
                <div className="xl:col-span-2">
                    <Card padded={false}>
                        <div className="flex items-center justify-between p-5 pb-3">
                            <div><h3 className="flex items-center gap-2 text-base font-semibold text-white"><KeyRound className="size-4 text-amber-300" /> لایسنس‌ها</h3><p className="mt-1 text-xs text-neutral-500">{formatNumber(licenses.length)} لایسنس · {formatNumber(active)} فعال</p></div>
                        </div>
                        <DataTable columns={columns} rows={licenses} rowKey={(l) => l.id} onRowClick={(l) => router.visit(route('admin.licenses.show', l.uuid))} emptyTitle="این مشتری هنوز لایسنسی ندارد" emptyAction={can('license.issue') && <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setIssue(true)}>صدور اولین لایسنس</Button>} />
                    </Card>
                </div>
            </div>
            <CustomerFormModal open={edit} onClose={() => setEdit(false)} customer={customer} />
            <IssueLicenseModal open={issue} onClose={() => setIssue(false)} plans={plans} customers={[{ id: customer.id, name: customer.name }]} defaultCustomerId={customer.id} />
        </>
    );
}

CustomerShow.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
