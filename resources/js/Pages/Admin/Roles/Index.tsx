import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Pencil, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { Checkbox, Field, Input, Textarea } from '@/Components/ui/Field';
import { PageHeader } from '@/Components/ui/PageHeader';
import AdminLayout from '@/Layouts/AdminLayout';
import { EASE_OUT_EXPO, fadeUp, listItem, stagger } from '@/lib/motion';
import { permissionGroupLabels } from '@/lib/status';
import { cn, formatNumber } from '@/lib/utils';
import type { PageProps, Permission, Role } from '@/types';

type Props = PageProps<{ roles: Role[]; permissions: Record<string, Permission[]> }>;

export default function RolesIndex({ roles, permissions }: Props) {
    const [selected, setSelected] = useState<Role | null>(roles[0] ?? null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<Role | null>(null);
    const [busy, setBusy] = useState(false);
    const total = useMemo(() => Object.values(permissions).reduce((a, g) => a + g.length, 0), [permissions]);

    useEffect(() => {
        // keep selection in sync after server round-trip
        if (selected) setSelected(roles.find((r) => r.id === selected.id) ?? roles[0] ?? null);
        else if (roles[0]) setSelected(roles[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roles]);

    return (
        <>
            <Head title="نقش‌ها و دسترسی‌ها" />
            <PageHeader title="نقش‌ها و دسترسی‌ها" description={`${formatNumber(roles.length)} نقش · ${formatNumber(total)} مجوز`} actions={<Button icon={<Plus className="size-4" />} onClick={() => { setCreating(true); setSelected(null); }}>نقش جدید</Button>} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card padded={false} className="self-start">
                    <motion.ul variants={stagger(0.04)} className="p-2">
                        {roles.map((r) => {
                            const active = !creating && selected?.id === r.id;
                            return (
                                <motion.li key={r.id} variants={listItem}>
                                    <button onClick={() => { setCreating(false); setSelected(r); }} className={cn('relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition', active ? 'text-white' : 'text-neutral-400 hover:bg-white/[.03] hover:text-white')}>
                                        {active && <motion.span layoutId="role-active" className="absolute inset-0 rounded-xl bg-amber-400/[.09] ring-1 ring-amber-400/25" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                                        <span className={cn('relative grid size-9 place-items-center rounded-lg', r.name === 'super_admin' ? 'bg-amber-400/15 text-amber-300' : 'bg-white/[.05] text-neutral-400')}>{r.is_system ? <Lock className="size-4" /> : <ShieldCheck className="size-4" />}</span>
                                        <span className="relative min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.title}</span><span className="block truncate font-mono text-[11px] text-neutral-500">{r.name}</span></span>
                                        <span className="relative text-xs tabular-nums text-neutral-500">{r.name === 'super_admin' ? 'همه' : formatNumber(r.permissions?.length ?? 0)}</span>
                                    </button>
                                </motion.li>
                            );
                        })}
                    </motion.ul>
                </Card>
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {creating ? (
                            <motion.div key="new" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}>
                                <RoleEditor role={null} permissions={permissions} onDone={() => setCreating(false)} />
                            </motion.div>
                        ) : selected ? (
                            <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}>
                                <RoleEditor role={selected} permissions={permissions} onDelete={() => setDeleting(selected)} />
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
            <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} loading={busy} title={`حذف نقش «${deleting?.title}»`} description="ابتدا باید ادمین‌های این نقش را به نقش دیگری منتقل کنید." confirmLabel="حذف"
                onConfirm={() => { if (!deleting) return; setBusy(true); router.delete(route('admin.roles.destroy', deleting.id), { preserveScroll: true, onFinish: () => { setBusy(false); setDeleting(null); } }); }} />
        </>
    );
}

RolesIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

function RoleEditor({ role, permissions, onDone, onDelete }: { role: Role | null; permissions: Record<string, Permission[]>; onDone?: () => void; onDelete?: () => void }) {
    const isSuper = role?.name === 'super_admin';
    const form = useForm({ name: role?.name ?? '', title: role?.title ?? '', description: role?.description ?? '', permissions: role?.permissions?.map((p) => p.id) ?? [] });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (role) form.put(route('admin.roles.update', role.id), { preserveScroll: true });
        else form.post(route('admin.roles.store'), { preserveScroll: true, onSuccess: () => { form.reset(); onDone?.(); } });
    };
    const toggle = (id: number) => form.setData('permissions', form.data.permissions.includes(id) ? form.data.permissions.filter((x) => x !== id) : [...form.data.permissions, id]);
    const toggleGroup = (ids: number[]) => { const all = ids.every((i) => form.data.permissions.includes(i)); form.setData('permissions', all ? form.data.permissions.filter((x) => !ids.includes(x)) : Array.from(new Set([...form.data.permissions, ...ids]))); };

    return (
        <Card>
            <form onSubmit={submit} className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div><h3 className="flex items-center gap-2 text-base font-semibold text-white">{role ? <><Pencil className="size-4 text-neutral-500" /> ویرایش نقش</> : <><Plus className="size-4 text-neutral-500" /> نقش جدید</>}{role?.is_system && <Badge size="sm" tone="amber">سیستمی</Badge>}</h3>{isSuper && <p className="mt-1 text-xs text-amber-300/80">مدیر ارشد به‌صورت خودکار همه مجوزها را دارد؛ انتخاب مجوز برای این نقش تأثیری ندارد.</p>}</div>
                    <div className="flex gap-2">{role && !role.is_system && <Button type="button" variant="ghost" size="sm" className="text-rose-300 hover:bg-rose-500/10" icon={<Trash2 className="size-3.5" />} onClick={onDelete}>حذف</Button>}<Button type="submit" size="sm" loading={form.processing} icon={<Save className="size-4" />}>{role ? 'ذخیره' : 'ایجاد'}</Button></div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="عنوان" required error={form.errors.title}><Input value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} invalid={!!form.errors.title} /></Field>
                    <Field label="نام سیستمی" required error={form.errors.name} hint={role?.is_system ? 'نام نقش سیستمی قابل تغییر نیست' : 'snake_case'}><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} disabled={role?.is_system} dir="ltr" className="font-mono" invalid={!!form.errors.name} /></Field>
                    <Field label="توضیحات" error={form.errors.description} className="sm:col-span-2"><Textarea rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} /></Field>
                </div>
                <div>
                    <div className="mb-3 flex items-center justify-between"><label className="text-[13px] font-medium text-neutral-300">مجوزها</label><span className="text-xs text-neutral-500">{formatNumber(form.data.permissions.length)} انتخاب‌شده</span></div>
                    <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {Object.entries(permissions).map(([group, list]) => {
                            const ids = list.map((p) => p.id);
                            const count = ids.filter((i) => form.data.permissions.includes(i)).length;
                            return (
                                <motion.div key={group} variants={fadeUp} className={cn('rounded-xl p-3 ring-1 transition', count === ids.length ? 'bg-amber-400/[.04] ring-amber-400/20' : 'bg-white/[.02] ring-white/[.06]', isSuper && 'opacity-60')}>
                                    <button type="button" disabled={isSuper} onClick={() => toggleGroup(ids)} className="mb-2 flex w-full items-center justify-between text-right"><span className="text-sm font-medium text-white">{permissionGroupLabels[group] ?? group}</span><span className="text-[11px] tabular-nums text-neutral-500">{formatNumber(count)}/{formatNumber(ids.length)}</span></button>
                                    <div className="space-y-1.5">{list.map((p) => <Checkbox key={p.id} disabled={isSuper} checked={isSuper || form.data.permissions.includes(p.id)} onChange={() => toggle(p.id)} label={p.title} description={p.name} />)}</div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                    {form.errors.permissions && <p className="mt-2 text-xs text-rose-400">{form.errors.permissions}</p>}
                </div>
            </form>
        </Card>
    );
}
