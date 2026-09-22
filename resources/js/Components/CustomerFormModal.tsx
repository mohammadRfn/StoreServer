import { useForm } from '@inertiajs/react';
import { Save, UserPlus } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { Button } from '@/Components/ui/Button';
import { Field, Input, Select, Textarea } from '@/Components/ui/Field';
import { Modal } from '@/Components/ui/Modal';
import type { Customer, CustomerStatus } from '@/types';

interface Props {
    open: boolean;
    onClose: () => void;
    customer?: Customer | null;
}

const empty = { name: '', company: '', phone: '', email: '', national_id: '', province: '', city: '', address: '', notes: '', status: 'active' as CustomerStatus };

export function CustomerFormModal({ open, onClose, customer }: Props) {
    const form = useForm({ ...empty });
    const editing = !!customer;

    useEffect(() => {
        if (open) {
            form.clearErrors();
            form.setData(customer ? { ...empty, ...Object.fromEntries(Object.entries(customer).filter(([k]) => k in empty).map(([k, v]) => [k, v ?? ''])) } as typeof empty : { ...empty });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, customer?.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => { form.reset(); onClose(); } };
        if (editing && customer) form.put(route('admin.customers.update', customer.uuid), opts);
        else form.post(route('admin.customers.store'), opts);
    };

    const bind = (k: keyof typeof empty) => ({ value: form.data[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => form.setData(k, e.target.value as never), invalid: !!form.errors[k] });

    return (
        <Modal open={open} onClose={onClose} size="lg" title={editing ? 'ویرایش مشتری' : 'ثبت مشتری جدید'} description={editing ? customer?.name : 'مشتری صاحب لایسنس‌ها و دستگاه‌هاست'}
            footer={<><Button variant="ghost" onClick={onClose}>انصراف</Button><Button form="customer-form" type="submit" loading={form.processing} icon={editing ? <Save className="size-4" /> : <UserPlus className="size-4" />}>{editing ? 'ذخیره' : 'ثبت مشتری'}</Button></>}>
            <form id="customer-form" onSubmit={submit} className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
                <Field label="نام" required error={form.errors.name}><Input {...bind('name')} autoFocus /></Field>
                <Field label="شرکت / فروشگاه" error={form.errors.company}><Input {...bind('company')} /></Field>
                <Field label="تلفن" error={form.errors.phone}><Input {...bind('phone')} dir="ltr" placeholder="09xxxxxxxxx" /></Field>
                <Field label="ایمیل" error={form.errors.email}><Input {...bind('email')} type="email" dir="ltr" /></Field>
                <Field label="کد ملی / شناسه" error={form.errors.national_id}><Input {...bind('national_id')} dir="ltr" /></Field>
                <Field label="وضعیت" required error={form.errors.status}>
                    <Select {...bind('status')}><option value="active">فعال</option><option value="inactive">غیرفعال</option></Select>
                </Field>
                <Field label="استان" error={form.errors.province}><Input {...bind('province')} /></Field>
                <Field label="شهر" error={form.errors.city}><Input {...bind('city')} /></Field>
                <Field label="آدرس" error={form.errors.address} className="sm:col-span-2"><Textarea {...bind('address')} rows={2} /></Field>
                <Field label="یادداشت داخلی" error={form.errors.notes} className="sm:col-span-2"><Textarea {...bind('notes')} rows={2} placeholder="فقط برای ادمین‌ها قابل مشاهده است" /></Field>
            </form>
        </Modal>
    );
}
