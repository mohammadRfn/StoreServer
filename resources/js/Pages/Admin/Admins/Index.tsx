import { Head, router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Save, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Avatar } from '@/Components/ui/Avatar';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { Checkbox, Field, Input, Switch } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { SearchInput } from '@/Components/ui/SearchInput';
import { useCan } from '@/Hooks/useCan';
import { useDebouncedFilters } from '@/Hooks/useDebouncedFilters';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp } from '@/lib/motion';
import { formatDate, timeAgo } from '@/lib/utils';
import type { AdminUser, PageProps, Paginated, Role } from '@/types';

type Props = PageProps<{ admins: Paginated<AdminUser>; roles: Pick<Role, 'id' | 'name' | 'title'>[]; filters: { q?: string } }>;

export default function AdminsIndex({ admins, roles, filters }: Props) {
    const { user: me } = useCan();
    const [editing, setEditing] = useState<AdminUser | null | undefined>(undefined);
    const [deleting, setDeleting] = useState<AdminUser | null>(null);
    const [busy, setBusy] = useState(false);
    const { values, set } = useDebouncedFilters(route('admin.admins.index'), { q: filters.q ?? '' });

    const columns: Column<AdminUser>[] = [
        { key: 'user', header: 'ادمین', render: (a) => <div className="flex items-center gap-3"><Avatar name={a.name} /><div><p className="flex items-center gap-2 font-medium text-white">{a.name}{a.id === me?.id && <Badge size="sm" tone="amber">شما</Badge>}</p><p className="text-xs text-neutral-500" dir="ltr">{a.email}</p></div></div> },
        { key: 'roles', header: 'نقش‌ها', render: (a) => <div className="flex flex-wrap gap-1">{a.roles.map((r) => <Badge key={r.id} size="sm" tone={r.name === 'super_admin' ? 'amber' : 'violet'}>{r.title}</Badge>)}{a.roles.length === 0 && <span className="text-xs text-neutral-600">بدون نقش</span>}</div> },
        { key: 'status', header: 'وضعیت', hideBelow: 'md', render: (a) => <Badge tone={a.is_active ? 'success' : 'neutral'} dot pulse={a.is_active}>{a.is_active ? 'فعال' : 'غیرفعال'}</Badge> },
        { key: 'login', header: 'آخرین ورود', hideBelow: 'lg', render: (a) => <div className="text-xs"><p className="text-neutral-300">{a.last_login_at ? timeAgo(a.last_login_at) : '—'}</p>{a.last_login_ip && <p className="font-mono text-neutral-500">{a.last_login_ip}</p>}</div> },
        { key: 'created', header: 'ایجاد', hideBelow: 'xl', render: (a) => <span className="text-xs text-neutral-400">{formatDate(a.created_at, false)}</span> },
        { key: 'actions', header: '', className: 'text-left', render: (a) => <div className="flex justify-end gap-1"><Button size="xs" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(a)} /><Button size="xs" variant="ghost" className="text-rose-300 hover:bg-rose-500/10" icon={<Trash2 className="size-3.5" />} disabled={a.id === me?.id} onClick={() => setDeleting(a)} /></div> },
    ];

    return (
        <>
            <Head title="ادمین‌ها" />
            <PageHeader title="ادمین‌ها" description="کاربران پنل مدیریت و نقش‌های آن‌ها" actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing(null)}>ادمین جدید</Button>} />
            <Card padded={false}>
                <motion.div variants={fadeUp} className="border-b border-white/[.06] p-4"><SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="نام یا ایمیل…" /></motion.div>
                <DataTable columns={columns} rows={admins.data} rowKey={(a) => a.id} emptyTitle="ادمینی یافت نشد" />
                <div className="px-4 pb-4"><Pagination paginator={admins} /></div>
            </Card>
            <AdminFormModal open={editing !== undefined} onClose={() => setEditing(undefined)} admin={editing ?? null} roles={roles} />
            <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} loading={busy} title={`حذف ${deleting?.name}`} description="دسترسی این ادمین به پنل بلافاصله قطع می‌شود. آخرین مدیر ارشد قابل حذف نیست." confirmLabel="حذف"
                onConfirm={() => { if (!deleting) return; setBusy(true); router.delete(route('admin.admins.destroy', deleting.id), { preserveScroll: true, onFinish: () => { setBusy(false); setDeleting(null); } }); }} />
        </>
    );
}

AdminsIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

function AdminFormModal({ open, onClose, admin, roles }: { open: boolean; onClose: () => void; admin: AdminUser | null; roles: Props['roles'] }) {
    const editing = !!admin;
    const form = useForm({ name: '', email: '', phone: '', password: '', is_active: true, roles: [] as number[] });
    useEffect(() => {
        if (!open) return;
        form.clearErrors();
        form.setData(admin ? { name: admin.name, email: admin.email, phone: admin.phone ?? '', password: '', is_active: admin.is_active, roles: admin.roles.map((r) => r.id) } : { name: '', email: '', phone: '', password: '', is_active: true, roles: [] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, admin?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } };
        if (editing && admin) form.put(route('admin.admins.update', admin.id), opts);
        else form.post(route('admin.admins.store'), opts);
    };

    return (
        <Modal open={open} onClose={onClose} title={editing ? `ویرایش ${admin?.name}` : 'ایجاد ادمین'} size="md"
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="admin-form" type="submit" loading={form.processing} icon={editing ? <Save className="size-4" /> : <UserPlus className="size-4" />}>{editing ? 'ذخیره' : 'ایجاد'}</Button></>}>
            <form id="admin-form" onSubmit={submit} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="نام" required error={form.errors.name}><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} invalid={!!form.errors.name} autoFocus /></Field>
                    <Field label="تلفن" error={form.errors.phone}><Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} dir="ltr" /></Field>
                </div>
                <Field label="ایمیل" required error={form.errors.email}><Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} invalid={!!form.errors.email} dir="ltr" autoComplete="off" /></Field>
                <Field label={editing ? 'گذرواژه جدید (اختیاری)' : 'گذرواژه'} required={!editing} error={form.errors.password} hint="حداقل ۸ کاراکتر"><Input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} invalid={!!form.errors.password} dir="ltr" autoComplete="new-password" /></Field>
                <Field label="نقش‌ها" error={form.errors.roles}>
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[.02] p-3 ring-1 ring-white/[.06]">
                        {roles.map((r) => <Checkbox key={r.id} checked={form.data.roles.includes(r.id)} onChange={(v) => form.setData('roles', v ? [...form.data.roles, r.id] : form.data.roles.filter((x) => x !== r.id))} label={<span className="flex items-center gap-1.5">{r.name === 'super_admin' && <ShieldCheck className="size-3.5 text-amber-300" />}{r.title}</span>} description={r.name} />)}
                    </div>
                </Field>
                <Switch checked={form.data.is_active} onChange={(v) => form.setData('is_active', v)} label="حساب فعال" description="ادمین غیرفعال نمی‌تواند وارد پنل شود" />
            </form>
        </Modal>
    );
}
