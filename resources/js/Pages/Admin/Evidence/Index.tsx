import { Head, Link, useForm } from '@inertiajs/react';
import { FileSearch, Plus, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { Field, Input, Textarea } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import { Mono } from '@/Components/ui/CopyButton';
import { PageHeader } from '@/Components/ui/PageHeader';
import AdminLayout from '@/Layouts/AdminLayout';
import { formatDate } from '@/lib/utils';
import type { PageProps } from '@/types';

interface ReportMeta {
    report_id: string;
    title: string;
    reference: string | null;
    generated_at: string;
    generated_by: string | null;
    sha256: string;
    bytes: number;
}

type Props = PageProps<{
    license: { uuid: string; status: string; customer?: { uuid: string; name: string }; device?: { hostname: string | null; fingerprint: string } };
    reports: ReportMeta[];
}>;

export default function EvidenceIndex({ license, reports }: Props) {
    const [open, setOpen] = useState(false);
    const form = useForm({ title: '', reference: '', notes: '' });

    const send = () => form.post(route('admin.evidence.store', license.uuid), { onFinish: () => setOpen(false) });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        send();
    };

    const columns: Column<ReportMeta>[] = [
        { key: 'title', header: 'عنوان', render: (r) => <div><p className="text-sm font-medium text-white">{r.title}</p>{r.reference && <p className="text-xs text-neutral-500">شماره پرونده: {r.reference}</p>}</div> },
        { key: 'at', header: 'زمان تولید', render: (r) => <span className="text-xs text-neutral-300">{formatDate(r.generated_at)}</span> },
        { key: 'by', header: 'تولیدکننده', hideBelow: 'md', render: (r) => <span className="text-xs text-neutral-400">{r.generated_by ?? '—'}</span> },
        { key: 'sha', header: 'SHA-256', hideBelow: 'lg', render: (r) => <Mono className="text-[11px] text-neutral-500">{r.sha256.slice(0, 16)}…</Mono> },
    ];

    return (
        <>
            <Head title="گزارش مدرک" />
            <PageHeader
                breadcrumbs={[{ label: 'لایسنس‌ها', href: route('admin.licenses.index') }, { label: license.uuid.slice(0, 8), href: route('admin.licenses.show', license.uuid) }, { label: 'گزارش مدرک' }]}
                title="گزارش مدرک"
                description={`${license.customer?.name ?? ''} · ${license.device?.hostname ?? 'بدون دستگاه'}`}
                actions={<Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>تولید گزارش جدید</Button>}
            />

            <Card className="mb-6">
                <CardHeader title="این گزارش شامل چه چیزهایی است؟" action={<ShieldCheck className="size-5 text-neutral-500" />} />
                <p className="text-sm leading-7 text-neutral-400">
                    مشخصات مشتری و لایسنس، سخت‌افزار دستگاه، فهرست همه‌ی IPها با اولین و آخرین زمان مشاهده (UTC)، درخواست‌های فعال‌سازی، رویدادهای امنیتی، ضربان‌ها، درخواست‌های ناموفق API،
                    اقدامات مدیران، وضعیت زنجیره‌ی هش لاگ اپ و یک خط زمانی یکپارچه. هر گزارش به‌صورت تصویر ثابت ذخیره می‌شود و هش SHA-256 آن در لاگ فقط‌افزودنی ثبت می‌گردد.
                </p>
            </Card>

            <Card padded={false}>
                <div className="p-5 pb-0">
                    <CardHeader title="گزارش‌های تولیدشده" />
                </div>
                <DataTable
                    columns={columns}
                    rows={reports}
                    rowKey={(r) => r.report_id}
                    emptyTitle="هنوز گزارشی تولید نشده"
                    emptyDescription="با «تولید گزارش جدید» یک تصویر ثابت از وضعیت فعلی لایسنس بگیرید."
                    onRowClick={(r) => (window.location.href = route('admin.evidence.show', [license.uuid, r.report_id]))}
                />
            </Card>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="تولید گزارش مدرک"
                description="اطلاعات این فرم در سربرگ گزارش درج می‌شود."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
                        <Button icon={<FileSearch className="size-4" />} loading={form.processing} onClick={send}>تولید گزارش</Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <Field label="عنوان گزارش" required error={form.errors.title}>
                        <Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} placeholder="مثلاً: استفاده‌ی غیرمجاز از لایسنس" autoFocus />
                    </Field>
                    <Field label="شماره پرونده / ارجاع" hint="اختیاری" error={form.errors.reference}>
                        <Input value={form.data.reference} onChange={(e) => form.setData('reference', e.target.value)} />
                    </Field>
                    <Field label="توضیحات" hint="شرح مختصر تخلف؛ در سربرگ گزارش چاپ می‌شود" error={form.errors.notes}>
                        <Textarea rows={4} value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                    </Field>
                </form>
            </Modal>
        </>
    );
}

EvidenceIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;