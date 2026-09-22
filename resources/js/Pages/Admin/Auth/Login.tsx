import { Head, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/Components/ui/Button';
import { Checkbox, Field, Input } from '@/Components/ui/Field';
import GuestLayout from '@/Layouts/GuestLayout';
import { EASE_OUT_EXPO } from '@/lib/motion';

export default function Login() {
    const [show, setShow] = useState(false);
    const form = useForm({ email: '', password: '', remember: false });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('admin.login.attempt'), { onFinish: () => form.reset('password') });
    };

    return (
        <>
            <Head title="ورود به پنل" />
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.15 }}
                className="relative overflow-hidden rounded-3xl bg-neutral-900/70 p-7 ring-1 ring-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8"
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-amber-300/50 to-transparent" />
                <h2 className="text-lg font-semibold text-white">ورود ادمین</h2>
                <p className="mt-1 text-sm text-neutral-400">برای ادامه، اطلاعات حساب خود را وارد کنید.</p>

                <form onSubmit={submit} className="mt-6 space-y-5">
                    <Field label="ایمیل" error={form.errors.email} htmlFor="email">
                        <Input
                            id="email"
                            type="email"
                            dir="ltr"
                            autoComplete="username"
                            autoFocus
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            invalid={!!form.errors.email}
                            startIcon={<Mail className="size-4" />}
                            className="text-left"
                            placeholder="admin@example.com"
                        />
                    </Field>
                    <Field label="گذرواژه" error={form.errors.password} htmlFor="password">
                        <Input
                            id="password"
                            type={show ? 'text' : 'password'}
                            dir="ltr"
                            autoComplete="current-password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            invalid={!!form.errors.password}
                            startIcon={<Lock className="size-4" />}
                            className="text-left"
                            placeholder="••••••••"
                            endIcon={
                                <button type="button" onClick={() => setShow((v) => !v)} className="p-0.5 hover:text-white" tabIndex={-1}>
                                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            }
                        />
                    </Field>
                    <Checkbox checked={form.data.remember} onChange={(v) => form.setData('remember', v)} label="مرا به خاطر بسپار" />
                    <Button type="submit" block size="lg" loading={form.processing} icon={<LogIn className="size-4" />}>
                        ورود به پنل
                    </Button>
                </form>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 text-center text-xs text-neutral-600">
                ورودهای ناموفق ثبت و محدود می‌شوند · ارتباط رمزنگاری‌شده
            </motion.p>
        </>
    );
}

Login.layout = (page: React.ReactNode) => <GuestLayout>{page}</GuestLayout>;
