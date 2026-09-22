import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Boxes, Check, KeyRound, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { useCan } from '@/Hooks/useCan';
import AdminLayout from '@/Layouts/AdminLayout';
import { EASE_OUT_EXPO, fadeUp, stagger } from '@/lib/motion';
import { durationType } from '@/lib/status';
import { cn, formatNumber, formatPrice } from '@/lib/utils';
import type { DurationType, GameshopModule, PageProps, Plan } from '@/types';

type Props = PageProps<{ plans: Plan[]; modules: GameshopModule[] }>;

export default function PlansIndex({ plans, modules }: Props) {
    const { can } = useCan();
    const [editing, setEditing] = useState<Plan | null | undefined>(undefined);
    const [deleting, setDeleting] = useState<Plan | null>(null);
    const [busy, setBusy] = useState(false);

    return (
        <>
            <Head title="پلن‌ها" />
            <PageHeader title="پلن‌ها" description="هر پلن مجموعه‌ای از ماژول‌ها و محدودیت‌ها را برای مشتری تعریف می‌کند" actions={can('plan.manage') && <Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>پلن جدید</Button>} />

            <motion.div variants={stagger(0.07)} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                    {plans.map((p, i) => (
                        <PlanCard key={p.id} plan={p} featured={i === 1} allModules={modules} canManage={can('plan.manage')} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} />
                    ))}
                </AnimatePresence>
            </motion.div>

            <PlanFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} plan={editing ?? null} modules={modules} />
            <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} loading={busy} title={`حذف پلن «${deleting?.name}»`} description="فقط پلن‌های بدون لایسنس قابل حذف هستند." confirmLabel="حذف"
                onConfirm={() => { if (!deleting) return; setBusy(true); router.delete(route('admin.plans.destroy', deleting.code), { preserveScroll: true, onFinish: () => { setBusy(false); setDeleting(null); } }); }} />
        </>
    );
}

PlansIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* -------------------------------------------------------------------------- */

function PlanCard({ plan, featured, allModules, canManage, onEdit, onDelete }: { plan: Plan; featured?: boolean; allModules: GameshopModule[]; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
    const enabledIds = new Set(plan.modules?.map((m) => m.id));
    const core = allModules.filter((m) => m.is_core);
    const optional = allModules.filter((m) => !m.is_core);
    return (
        <motion.div layout variants={fadeUp} exit={{ opacity: 0, scale: 0.95 }} whileHover={{ y: -4 }} transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
            className={cn('group relative flex flex-col overflow-hidden rounded-2xl bg-neutral-900/70 p-6 ring-1', featured ? 'ring-amber-400/40 shadow-[0_0_80px_-30px_rgba(251,191,36,.5)]' : 'ring-white/[.07]', !plan.is_active && 'opacity-60')}>
            {featured && <div className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" />}
            <div className="relative flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                        {!plan.is_active && <Badge size="sm">غیرفعال</Badge>}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-neutral-500">{plan.code}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-white/[.04] text-amber-300 ring-1 ring-white/10"><Boxes className="size-5" /></span>
            </div>
            <div className="relative mt-5">
                <p className="text-3xl font-black tracking-tight text-white">{formatPrice(plan.price_irr)}</p>
                <p className="mt-1 text-xs text-neutral-500">مدت پیش‌فرض: {durationType[plan.default_duration]}</p>
            </div>
            {plan.description && <p className="relative mt-3 text-sm leading-6 text-neutral-400">{plan.description}</p>}

            <ul className="relative mt-5 space-y-2 border-t border-white/[.06] pt-5">
                {core.map((m) => <li key={m.id} className="flex items-center gap-2 text-sm text-neutral-300"><Check className="size-4 text-emerald-400" />{m.title}<span className="text-[10px] text-neutral-600">(هسته)</span></li>)}
                {optional.map((m) => {
                    const on = enabledIds.has(m.id);
                    return <li key={m.id} className={cn('flex items-center gap-2 text-sm', on ? 'text-neutral-200' : 'text-neutral-600 line-through decoration-neutral-700')}>{on ? <Check className="size-4 text-emerald-400" /> : <span className="size-4 text-center text-neutral-700">–</span>}{m.title}</li>;
                })}
            </ul>

            {plan.limits && plan.limits.length > 0 && (
                <div className="relative mt-4 flex flex-wrap gap-1.5">
                    {plan.limits.map((l) => <span key={l.limit_key} className="rounded-md bg-white/[.05] px-2 py-1 font-mono text-[11px] text-neutral-400 ring-1 ring-white/[.06]">{l.limit_key}: {l.limit_value === null ? '∞' : formatNumber(l.limit_value)}</span>)}
                </div>
            )}

            <div className="relative mt-auto flex items-center justify-between border-t border-white/[.06] pt-4 mt-6">
                <Link href={route('admin.plans.show', plan.code)} className="flex items-center gap-1.5 text-xs text-neutral-400 transition hover:text-amber-300"><KeyRound className="size-3.5" />{formatNumber(plan.licenses_count ?? 0)} لایسنس</Link>
                {canManage && (
                    <div className="flex gap-1">
                        <Button size="xs" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={onEdit}>ویرایش</Button>
                        <Button size="xs" variant="ghost" className="text-rose-300 hover:bg-rose-500/10" icon={<Trash2 className="size-3.5" />} disabled={(plan.licenses_count ?? 0) > 0} onClick={onDelete} />
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* ------------------------------ Plan form modal --------------------------- */

interface PlanFormData {
    code: string;
    name: string;
    description: string;
    price_irr: string;
    default_duration: DurationType;
    is_active: boolean;
    sort_order: string;
    modules: number[];
    limits: { key: string; value: string }[];
}

const emptyPlan: PlanFormData = { code: '', name: '', description: '', price_irr: '0', default_duration: 'yearly', is_active: true, sort_order: '0', modules: [], limits: [] };

export function PlanFormModal({ open, onClose, plan, modules }: { open: boolean; onClose: () => void; plan: Plan | null; modules: GameshopModule[] }) {
    const form = useForm<PlanFormData>({ ...emptyPlan });
    const editing = !!plan;

    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        form.setData(plan ? {
            code: plan.code, name: plan.name, description: plan.description ?? '', price_irr: String(plan.price_irr), default_duration: plan.default_duration, is_active: plan.is_active, sort_order: String(plan.sort_order),
            modules: plan.modules?.map((m) => m.id) ?? [],
            limits: plan.limits?.map((l) => ({ key: l.limit_key, value: l.limit_value === null ? '' : String(l.limit_value) })) ?? [],
        } : { ...emptyPlan });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, plan?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } };
        form.transform((d) => ({ ...d, price_irr: Number(d.price_irr), sort_order: Number(d.sort_order), limits: d.limits.filter((l) => l.key.trim()).map((l) => ({ key: l.key.trim(), value: l.value === '' ? null : Number(l.value) })) }));
        if (editing && plan) form.put(route('admin.plans.update', plan.code), opts);
        else form.post(route('admin.plans.store'), opts);
    };

    const toggleModule = (id: number) => form.setData('modules', form.data.modules.includes(id) ? form.data.modules.filter((m) => m !== id) : [...form.data.modules, id]);
    const setLimit = (i: number, patch: Partial<{ key: string; value: string }>) => form.setData('limits', form.data.limits.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

    return (
        <Modal open={open} onClose={onClose} size="xl" title={editing ? `ویرایش پلن ${plan?.name}` : 'ایجاد پلن جدید'}
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="plan-form" type="submit" loading={form.processing} icon={<Save className="size-4" />}>{editing ? 'ذخیره' : 'ایجاد پلن'}</Button></>}>
            <form id="plan-form" onSubmit={submit} className="grid grid-cols-1 gap-6 py-2 lg:grid-cols-5">
                <div className="space-y-4 lg:col-span-3">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="نام" required error={form.errors.name}><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} invalid={!!form.errors.name} autoFocus /></Field>
                        <Field label="کد" required error={form.errors.code} hint="حروف کوچک، عدد، خط تیره">
                            <Input value={form.data.code} onChange={(e) => form.setData('code', e.target.value.toLowerCase())} invalid={!!form.errors.code} dir="ltr" placeholder="pro" className="font-mono" />
                        </Field>
                    </div>
                    <Field label="توضیحات" error={form.errors.description}><Textarea rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></Field>
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="قیمت (ریال)" required error={form.errors.price_irr}><Input type="number" min={0} value={form.data.price_irr} onChange={(e) => form.setData('price_irr', e.target.value)} dir="ltr" /></Field>
                        <Field label="مدت پیش‌فرض" required error={form.errors.default_duration}>
                            <Select value={form.data.default_duration} onChange={(e) => form.setData('default_duration', e.target.value as DurationType)}>{(Object.keys(durationType) as DurationType[]).map((d) => <option key={d} value={d}>{durationType[d]}</option>)}</Select>
                        </Field>
                        <Field label="ترتیب" error={form.errors.sort_order}><Input type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} dir="ltr" /></Field>
                    </div>
                    <Switch checked={form.data.is_active} onChange={(v) => form.setData('is_active', v)} label="پلن فعال" description="پلن‌های غیرفعال برای صدور لایسنس جدید انتخاب نمی‌شوند" />

                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <label className="text-[13px] font-medium text-neutral-300">محدودیت‌ها</label>
                            <Button type="button" size="xs" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => form.setData('limits', [...form.data.limits, { key: '', value: '' }])}>افزودن</Button>
                        </div>
                        <div className="space-y-2">
                            <AnimatePresence initial={false}>
                                {form.data.limits.map((l, i) => (
                                    <motion.div key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 overflow-hidden">
                                        <Input value={l.key} onChange={(e) => setLimit(i, { key: e.target.value })} placeholder="max_users" dir="ltr" className="font-mono" />
                                        <Input type="number" min={0} value={l.value} onChange={(e) => setLimit(i, { value: e.target.value })} placeholder="∞" dir="ltr" className="w-28" />
                                        <Button type="button" size="sm" variant="ghost" className="shrink-0 text-rose-300" icon={<Trash2 className="size-3.5" />} onClick={() => form.setData('limits', form.data.limits.filter((_, idx) => idx !== i))} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {form.data.limits.length === 0 && <p className="text-xs text-neutral-600">بدون محدودیت (مقدار خالی = نامحدود)</p>}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <label className="mb-2 block text-[13px] font-medium text-neutral-300">ماژول‌های پلن</label>
                    <div className="space-y-1.5 rounded-xl bg-white/[.02] p-3 ring-1 ring-white/[.06]">
                        {modules.map((m) => (
                            <div key={m.id} className={cn('rounded-lg p-2 transition', form.data.modules.includes(m.id) || m.is_core ? 'bg-emerald-500/[.05]' : 'hover:bg-white/[.03]')}>
                                <Checkbox checked={m.is_core || form.data.modules.includes(m.id)} disabled={m.is_core || !m.is_active} onChange={() => toggleModule(m.id)} label={<span>{m.title}{m.is_core && <span className="mr-2 rounded bg-white/10 px-1.5 text-[10px]">هسته</span>}</span>} description={m.key} />
                            </div>
                        ))}
                    </div>
                    {form.errors.modules && <p className="mt-1 text-xs text-rose-400">{form.errors.modules}</p>}
                </div>
            </form>
        </Modal>
    );
}
