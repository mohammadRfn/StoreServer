import { Head, useForm } from '@inertiajs/react';
import { motion, Reorder } from 'framer-motion';
import { Cpu, GripVertical, Pencil, Plus, Save, Shield } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { Field, Input, Switch, Textarea } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import AdminLayout from '@/Layouts/AdminLayout';
import { cn } from '@/lib/utils';
import type { GameshopModule, PageProps } from '@/types';

type Props = PageProps<{ modules: GameshopModule[] }>;

export default function ModulesIndex({ modules }: Props) {
    const [editing, setEditing] = useState<GameshopModule | null | undefined>(undefined);
    const [order, setOrder] = useState(modules);
    useEffect(() => setOrder(modules), [modules]);

    return (
        <>
            <Head title="کاتالوگ ماژول‌ها" />
            <PageHeader title="کاتالوگ ماژول‌ها" description="ماژول‌های نرم‌افزار GameShop که در پلن‌ها قابل فعال‌سازی هستند" actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>ماژول جدید</Button>} />
            <Card padded={false}>
                <Reorder.Group axis="y" values={order} onReorder={setOrder} className="divide-y divide-white/[.05]">
                    {order.map((m) => (
                        <Reorder.Item key={m.id} value={m} className={cn('flex items-center gap-4 bg-neutral-900/0 px-4 py-3.5 transition hover:bg-white/[.02]', !m.is_active && 'opacity-50')} whileDrag={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,.04)', boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)' }}>
                            <GripVertical className="size-4 cursor-grab text-neutral-600 active:cursor-grabbing" />
                            <span className={cn('grid size-10 place-items-center rounded-xl ring-1', m.is_core ? 'bg-amber-400/10 text-amber-300 ring-amber-400/20' : 'bg-white/[.04] text-neutral-400 ring-white/10')}>{m.is_core ? <Shield className="size-4" /> : <Cpu className="size-4" />}</span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2"><p className="font-medium text-white">{m.title}</p>{m.is_core && <Badge tone="amber" size="sm">هسته</Badge>}{!m.is_active && <Badge size="sm">غیرفعال</Badge>}</div>
                                <p className="truncate text-xs text-neutral-500"><span className="font-mono">{m.key}</span>{m.description && ` — ${m.description}`}</p>
                            </div>
                            <span className="hidden text-xs tabular-nums text-neutral-600 sm:block">#{m.sort_order}</span>
                            <Button size="xs" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(m)}>ویرایش</Button>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-white/[.05] px-4 py-2.5 text-[11px] text-neutral-600">جابه‌جایی با درگ فقط پیش‌نمایش است؛ ترتیب نهایی از فیلد «ترتیب» در ویرایش ذخیره می‌شود.</motion.p>
            </Card>
            <ModuleFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} module={editing ?? null} />
        </>
    );
}

ModulesIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

function ModuleFormModal({ open, onClose, module }: { open: boolean; onClose: () => void; module: GameshopModule | null }) {
    const editing = !!module;
    const form = useForm({ key: '', title: '', description: '', is_core: false, is_active: true, sort_order: '0' });
    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        form.setData(module ? { key: module.key, title: module.title, description: module.description ?? '', is_core: module.is_core, is_active: module.is_active, sort_order: String(module.sort_order) } : { key: '', title: '', description: '', is_core: false, is_active: true, sort_order: '0' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, module?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } };
        form.transform((d) => (editing ? { title: d.title, description: d.description, is_active: d.is_active, sort_order: Number(d.sort_order) } : { key: d.key, title: d.title, description: d.description, is_core: d.is_core, sort_order: Number(d.sort_order) }));
        if (editing && module) form.put(route('admin.modules.update', module.id), opts);
        else form.post(route('admin.modules.store'), opts);
    };

    return (
        <Modal open={open} onClose={onClose} title={editing ? `ویرایش ${module?.title}` : 'افزودن ماژول'} size="sm"
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="module-form" type="submit" loading={form.processing} icon={<Save className="size-4" />}>ذخیره</Button></>}>
            <form id="module-form" onSubmit={submit} className="space-y-4 py-2">
                <Field label="کلید" required error={form.errors.key} hint="با حرف شروع شود، فقط حروف و عدد (مثلاً Inventory)"><Input value={form.data.key} onChange={(e) => form.setData('key', e.target.value)} disabled={editing} dir="ltr" className="font-mono" /></Field>
                <Field label="عنوان" required error={form.errors.title}><Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} /></Field>
                <Field label="توضیحات" error={form.errors.description}><Textarea rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} maxLength={255} /></Field>
                <Field label="ترتیب" error={form.errors.sort_order}><Input type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} dir="ltr" /></Field>
                {!editing && <Switch checked={form.data.is_core} onChange={(v) => form.setData('is_core', v)} label="ماژول هسته" description="همیشه فعال است و قابل خاموش‌کردن نیست" />}
                {editing && <Switch checked={form.data.is_active} onChange={(v) => form.setData('is_active', v)} label="فعال" description="ماژول غیرفعال در entitlement هیچ پلنی قرار نمی‌گیرد" />}
            </form>
        </Modal>
    );
}
