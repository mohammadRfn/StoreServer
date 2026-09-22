import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileArchive, MonitorSmartphone, Package, Plus, Upload, X } from 'lucide-react';
import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Badge, StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { Mono } from '@/Components/ui/CopyButton';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { Checkbox, Field, Select, Switch } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { SearchInput } from '@/Components/ui/SearchInput';
import { useCan } from '@/Hooks/useCan';
import { useDebouncedFilters } from '@/Hooks/useDebouncedFilters';
import { useDisclosure } from '@/Hooks/useDisclosure';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp } from '@/lib/motion';
import { patchStatus, patchTargetType } from '@/lib/status';
import { cn, formatBytes, formatDate, formatNumber } from '@/lib/utils';
import type { License, PageProps, Paginated, Patch, PatchStatus, PatchTargetType, Plan } from '@/types';

type Props = PageProps<{
    patches: Paginated<Patch>;
    plans: Pick<Plan, 'id' | 'code' | 'name'>[];
    licenses: Pick<License, 'id' | 'uuid'>[];
    filters: { q?: string; status?: string };
}>;

export default function PatchesIndex({ patches, plans, licenses, filters }: Props) {
    const { can } = useCan();
    const upload = useDisclosure();
    const { values, set } = useDebouncedFilters(route('admin.patches.index'), { q: filters.q ?? '', status: filters.status ?? '' });

    const columns: Column<Patch>[] = [
        {
            key: 'patch', header: 'پچ',
            render: (p) => (
                <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-white/[.04] text-neutral-400 ring-1 ring-white/10"><Package className="size-4" /></span>
                    <div>
                        <p className="flex items-center gap-2 font-medium text-white">{p.title}{p.is_mandatory && <Badge tone="danger" size="sm">اجباری</Badge>}</p>
                        <p className="text-xs text-neutral-500"><Mono className="text-amber-200/80">{p.patch_code}</Mono> · {p.from_min ?? '*'}–{p.from_max ?? '*'} → <span className="font-mono text-neutral-300">{p.to_version}</span></p>
                    </div>
                </div>
            ),
        },
        { key: 'status', header: 'وضعیت', render: (p) => <div><StatusBadge status={p.status} map={patchStatus} />{p.status === 'scheduled' && p.scheduled_at && <p className="mt-1 text-[11px] text-neutral-500">{formatDate(p.scheduled_at)}</p>}</div> },
        { key: 'target', header: 'هدف', hideBelow: 'md', render: (p) => <div className="text-xs"><p className="text-neutral-300">{patchTargetType[p.target_type]}</p>{p.target_type === 'plans' && <p className="text-neutral-500">{p.target_plans?.map((x) => x.name).join('، ')}</p>}</div> },
        { key: 'size', header: 'حجم', hideBelow: 'lg', render: (p) => <span className="text-xs text-neutral-400">{formatBytes(p.file_size)}</span> },
        { key: 'stats', header: 'دستگاه / دانلود', hideBelow: 'lg', render: (p) => <span className="flex items-center gap-3 text-xs text-neutral-400"><span className="flex items-center gap-1"><MonitorSmartphone className="size-3.5" />{formatNumber(p.device_statuses_count ?? 0)}</span><span className="flex items-center gap-1"><Download className="size-3.5" />{formatNumber(p.downloads_count ?? 0)}</span></span> },
        { key: 'by', header: 'آپلود', hideBelow: 'xl', render: (p) => <span className="text-xs text-neutral-400">{p.uploader?.name} · {formatDate(p.created_at, false)}</span> },
    ];

    return (
        <>
            <Head title="پچ‌ها" />
            <PageHeader title="پچ‌ها و به‌روزرسانی‌ها" description="فایل‌های ZIP امضاشده که به دستگاه‌های واجد شرایط تحویل داده می‌شوند" actions={can('patch.upload') && <Button icon={<Upload className="size-4" />} onClick={upload.onOpen}>آپلود پچ</Button>} />
            <Card padded={false}>
                <motion.div variants={fadeUp} className="flex flex-col gap-3 border-b border-white/[.06] p-4 md:flex-row">
                    <div className="flex-1"><SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="کد پچ یا عنوان…" /></div>
                    <Select value={values.status} onChange={(e) => set('status', e.target.value)} className="md:w-48"><option value="">همه وضعیت‌ها</option>{(Object.keys(patchStatus) as PatchStatus[]).map((s) => <option key={s} value={s}>{patchStatus[s].label}</option>)}</Select>
                </motion.div>
                <DataTable columns={columns} rows={patches.data} rowKey={(p) => p.id} onRowClick={(p) => router.visit(route('admin.patches.show', p.patch_code))} emptyTitle="پچی آپلود نشده" emptyAction={can('patch.upload') && <Button variant="secondary" icon={<Plus className="size-4" />} onClick={upload.onOpen}>آپلود اولین پچ</Button>} />
                <div className="px-4 pb-4"><Pagination paginator={patches} /></div>
            </Card>
            <UploadPatchModal open={upload.open} onClose={upload.onClose} plans={plans} licenses={licenses} />
        </>
    );
}

PatchesIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* -------------------------------- Upload modal --------------------------- */

function UploadPatchModal({ open, onClose, plans, licenses }: { open: boolean; onClose: () => void; plans: Props['plans']; licenses: Props['licenses'] }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [drag, setDrag] = useState(false);
    const form = useForm<{ file: File | null; target_type: PatchTargetType; is_mandatory: boolean; plans: number[]; licenses: number[]; depends_on: string }>({ file: null, target_type: 'all', is_mandatory: false, plans: [], licenses: [], depends_on: '' });

    const pick = (f: File | undefined) => {
        if (!f) return;
        if (!f.name.toLowerCase().endsWith('.zip')) { form.setError('file', 'فقط فایل ZIP مجاز است.'); return; }
        form.clearErrors('file');
        form.setData('file', f);
    };
    const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, depends_on: d.depends_on.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean) }));
        form.post(route('admin.patches.store'), { forceFormData: true, preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } });
    };

    const toggle = (key: 'plans' | 'licenses', id: number) => form.setData(key, form.data[key].includes(id) ? form.data[key].filter((x) => x !== id) : [...form.data[key], id]);

    return (
        <Modal open={open} onClose={onClose} size="lg" title="آپلود پچ جدید" description="فایل ZIP باید شامل manifest.json باشد. پس از آپلود، پچ امضا شده و در وضعیت پیش‌نویس قرار می‌گیرد."
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="upload-form" type="submit" loading={form.processing} disabled={!form.data.file} icon={<Upload className="size-4" />}>{form.processing && form.progress ? `${form.progress.percentage ?? 0}٪` : 'آپلود و امضا'}</Button></>}>
            <form id="upload-form" onSubmit={submit} className="space-y-5 py-2">
                <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()}
                    className={cn('relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300', drag ? 'border-amber-400 bg-amber-400/[.06] scale-[1.01]' : form.data.file ? 'border-emerald-500/40 bg-emerald-500/[.04]' : 'border-white/15 hover:border-white/30 hover:bg-white/[.02]', form.errors.file && 'border-rose-500/50')}>
                    <input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                    <AnimatePresence mode="wait">
                        {form.data.file ? (
                            <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center justify-center gap-3">
                                <FileArchive className="size-8 text-emerald-400" />
                                <div className="text-right"><p className="text-sm font-medium text-white" dir="ltr">{form.data.file.name}</p><p className="text-xs text-neutral-500">{formatBytes(form.data.file.size)}</p></div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); form.setData('file', null); }} className="rounded-lg p-1.5 text-neutral-500 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <motion.div animate={drag ? { y: -6 } : { y: 0 }} className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[.05] text-neutral-400 ring-1 ring-white/10"><Upload className="size-5" /></motion.div>
                                <p className="mt-3 text-sm text-neutral-300">فایل ZIP را اینجا رها کنید یا کلیک کنید</p>
                                <p className="mt-1 text-xs text-neutral-600">حداکثر ۵۱۲ مگابایت</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                {form.errors.file && <p className="-mt-3 text-xs text-rose-400">{form.errors.file}</p>}

                {form.processing && form.progress && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><motion.div className="h-full bg-amber-400" animate={{ width: `${form.progress.percentage ?? 0}%` }} transition={{ ease: 'linear' }} /></div>
                )}

                <Field label="هدف انتشار" required error={form.errors.target_type}>
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(patchTargetType) as PatchTargetType[]).map((t) => (
                            <button key={t} type="button" onClick={() => form.setData('target_type', t)} className={cn('rounded-xl px-3 py-2.5 text-sm ring-1 transition-all', form.data.target_type === t ? 'bg-amber-400 text-neutral-950 ring-amber-400' : 'bg-white/[.04] text-neutral-300 ring-white/10 hover:ring-white/25')}>{patchTargetType[t]}</button>
                        ))}
                    </div>
                </Field>

                <AnimatePresence mode="wait">
                    {form.data.target_type === 'plans' && (
                        <motion.div key="plans" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <Field label="پلن‌های هدف" required error={form.errors.plans}><div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[.02] p-3 ring-1 ring-white/[.06]">{plans.map((p) => <Checkbox key={p.id} checked={form.data.plans.includes(p.id)} onChange={() => toggle('plans', p.id)} label={p.name} />)}</div></Field>
                        </motion.div>
                    )}
                    {form.data.target_type === 'licenses' && (
                        <motion.div key="lic" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <Field label="لایسنس‌های هدف" required error={form.errors.licenses} hint={`${form.data.licenses.length} انتخاب‌شده`}><div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-xl bg-white/[.02] p-3 ring-1 ring-white/[.06]">{licenses.map((l) => <Checkbox key={l.id} checked={form.data.licenses.includes(l.id)} onChange={() => toggle('licenses', l.id)} label={<span className="font-mono text-xs">{l.uuid.slice(0, 13)}…</span>} />)}</div></Field>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Field label="وابستگی‌ها" error={form.errors.depends_on} hint="کد پچ‌های پیش‌نیاز، جداشده با ویرگول">
                    <input className="w-full rounded-xl bg-white/[.04] px-3.5 py-2.5 font-mono text-sm text-neutral-100 ring-1 ring-inset ring-white/10 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400/60" dir="ltr" placeholder="P-20250101-001, P-20250115-002" value={form.data.depends_on} onChange={(e) => form.setData('depends_on', e.target.value)} />
                </Field>
                <Switch checked={form.data.is_mandatory} onChange={(v) => form.setData('is_mandatory', v)} label="پچ اجباری" description="کلاینت تا نصب این پچ اجازه ادامه کار ندارد" />
            </form>
        </Modal>
    );
}
