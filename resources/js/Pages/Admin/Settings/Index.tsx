import { Head, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, Save, Settings2 } from 'lucide-react';
import { useMemo, type FormEvent } from 'react';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { Mono } from '@/Components/ui/CopyButton';
import { Field, Input, Switch, Textarea } from '@/Components/ui/Field';
import { PageHeader } from '@/Components/ui/PageHeader';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp, stagger } from '@/lib/motion';
import { formatDate } from '@/lib/utils';
import type { PageProps, ServerSetting, SigningKey } from '@/types';

type Props = PageProps<{ settings: ServerSetting[]; signingKeys: SigningKey[] }>;

const groupLabels: Record<string, string> = { general: 'عمومی', license: 'لایسنس', token: 'توکن', security: 'امنیت', patch: 'پچ', retention: 'نگهداشت لاگ', heartbeat: 'ضربان' };

export default function SettingsIndex({ settings, signingKeys }: Props) {
    const form = useForm({ settings: settings.map((s) => ({ key: s.key, value: s.value ?? '' })) });
    const groups = useMemo(() => { const g: Record<string, ServerSetting[]> = {}; settings.forEach((s) => (g[s.group] ??= []).push(s)); return g; }, [settings]);
    const original = useMemo(() => Object.fromEntries(settings.map((s) => [s.key, s.value ?? ''])), [settings]);
    const dirty = form.data.settings.filter((s) => original[s.key] !== String(s.value)).length;

    const val = (key: string) => form.data.settings.find((s) => s.key === key)?.value ?? '';
    const setVal = (key: string, value: string) => form.setData('settings', form.data.settings.map((s) => (s.key === key ? { ...s, value } : s)));
    const submit = (e: FormEvent) => { e.preventDefault(); form.put(route('admin.settings.update'), { preserveScroll: true }); };
    const isBool = (t: string) => t === 'bool' || t === 'boolean';
    const isInt = (t: string) => t === 'int' || t === 'integer';

    return (
        <>
            <Head title="تنظیمات سرور" />
            <form onSubmit={submit}>
                <PageHeader title="تنظیمات سرور" description="پارامترهای رفتاری لایسنسینگ، امنیت و پچ — بلافاصله پس از ذخیره اعمال می‌شوند" actions={<Button type="submit" loading={form.processing} disabled={dirty === 0} icon={<Save className="size-4" />}>ذخیره{dirty > 0 && ` (${dirty})`}</Button>} />
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <motion.div variants={stagger(0.06)} className="space-y-6 xl:col-span-2">
                        {Object.entries(groups).map(([group, list]) => (
                            <Card key={group}>
                                <CardHeader title={groupLabels[group] ?? group} action={<Settings2 className="size-5 text-neutral-500" />} />
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    {list.map((s) => {
                                        const err = form.errors[`settings.${form.data.settings.findIndex((x) => x.key === s.key)}.value` as keyof typeof form.errors];
                                        const changed = original[s.key] !== String(val(s.key));
                                        return (
                                            <motion.div key={s.key} variants={fadeUp} className={`relative rounded-xl p-3 ring-1 transition ${changed ? 'bg-amber-400/[.04] ring-amber-400/25' : 'ring-transparent'}`}>
                                                {isBool(s.type) ? (
                                                    <Switch checked={['1', 'true', 'on', 'yes'].includes(String(val(s.key)).toLowerCase())} onChange={(v) => setVal(s.key, v ? '1' : '0')} label={s.description ?? s.key} description={s.key} />
                                                ) : (
                                                    <Field label={s.description ?? s.key} error={err} hint={<Mono>{s.key}</Mono>}>
                                                        {s.type === 'json' ? <Textarea rows={3} value={val(s.key)} onChange={(e) => setVal(s.key, e.target.value)} dir="ltr" className="font-mono text-xs" /> : <Input type={isInt(s.type) ? 'number' : 'text'} value={val(s.key)} onChange={(e) => setVal(s.key, e.target.value)} dir="ltr" invalid={!!err} />}
                                                    </Field>
                                                )}
                                                {s.is_public && <Badge size="sm" tone="info" className="absolute left-3 top-3">عمومی</Badge>}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </Card>
                        ))}
                        {settings.length === 0 && <Card><p className="text-sm text-neutral-500">هیچ تنظیمی در جدول server_settings وجود ندارد.</p></Card>}
                    </motion.div>
                    <div>
                        <Card>
                            <CardHeader title="کلیدهای امضا" description="Ed25519 — کلید خصوصی هرگز در دیتابیس ذخیره نمی‌شود" action={<KeyRound className="size-5 text-neutral-500" />} />
                            <ul className="space-y-2">
                                {signingKeys.map((k) => (
                                    <li key={k.id} className={`rounded-xl p-3 ring-1 ${k.status === 'active' ? 'bg-emerald-500/[.05] ring-emerald-500/20' : 'bg-white/[.02] ring-white/[.06]'}`}>
                                        <div className="flex items-center justify-between"><Mono className="text-white">{k.kid}</Mono><Badge size="sm" tone={k.status === 'active' ? 'success' : 'neutral'} dot pulse={k.status === 'active'}>{k.status === 'active' ? 'فعال' : k.status === 'retired' ? 'بازنشسته' : k.status}</Badge></div>
                                        <p className="mt-1.5 text-[11px] text-neutral-500">{k.algorithm} · فعال از {formatDate(k.activated_at, false)}{k.retired_at && ` · بازنشسته ${formatDate(k.retired_at, false)}`}</p>
                                    </li>
                                ))}
                                {signingKeys.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-neutral-500">کلیدی ثبت نشده. اجرا کنید: <Mono>php artisan licensing:keygen</Mono></li>}
                            </ul>
                        </Card>
                    </div>
                </div>
                <AnimatePresence>
                    {dirty > 0 && (
                        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
                            <div className="flex items-center gap-4 rounded-2xl bg-neutral-900/95 py-2.5 pr-5 pl-2.5 ring-1 ring-amber-400/30 shadow-2xl shadow-black/60 backdrop-blur-xl"><span className="text-sm text-neutral-200">{dirty} تغییر ذخیره‌نشده</span><Button type="button" size="sm" variant="ghost" onClick={() => form.reset()}>بازگردانی</Button><Button type="submit" size="sm" loading={form.processing} icon={<Save className="size-4" />}>ذخیره</Button></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </>
    );
}

SettingsIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
