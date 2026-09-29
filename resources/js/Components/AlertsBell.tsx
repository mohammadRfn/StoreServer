import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import type { PageProps } from '@/types';

const typeLabel: Record<string, string> = {
    chain_broken: 'شکست زنجیره‌ی هش لاگ',
    chain_gap: 'رکورد گمشده در لاگ اپ',
    client_logs_silent: 'دستگاه فعال ولی بدون لاگ',
    client_logs_stuck: 'صف ارسال لاگ اپ گیر کرده',
    fingerprint_mismatch: 'استفاده از لایسنس روی دستگاه دیگر',
};

export function AlertsBell() {
    const alerts = usePage<PageProps>().props.alerts;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [open]);

    if (!alerts) return null;

    const ack = (id: number | string) => router.post(route('admin.alerts.ack', id), {}, { preserveScroll: true, preserveState: true });
    const ackAll = () => router.post(route('admin.alerts.ack-all'), {}, { preserveScroll: true, preserveState: true });

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                className="relative rounded-lg p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
                title="هشدارهای امنیتی و سلامت اپ‌ها"
                aria-label="هشدارها"
            >
                <ShieldAlert className={cn('size-5', alerts.critical > 0 && 'text-rose-300')} />
                {alerts.count > 0 && (
                    <span className={cn('absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-neutral-950', alerts.critical > 0 ? 'bg-rose-400' : 'bg-amber-400')}>
                        {alerts.count > 99 ? '99+' : formatNumber(alerts.count)}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                        className="absolute left-0 mt-2 w-80 origin-top-left overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10 shadow-2xl shadow-black/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3">
                            <p className="text-sm font-medium text-white">هشدارها</p>
                            {alerts.count > 0 && (
                                <button onClick={ackAll} className="text-xs text-amber-300 hover:underline">
                                    بررسی همه
                                </button>
                            )}
                        </div>
                        <div className="h-px bg-white/[.06]" />

                        {alerts.items.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-neutral-500">هشدار بررسی‌نشده‌ای وجود ندارد.</p>
                        ) : (
                            <ul className="max-h-96 divide-y divide-white/[.05] overflow-y-auto">
                                {alerts.items.map((a) => (
                                    <li key={a.id} className="flex items-start gap-2 px-4 py-3">
                                        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', a.severity === 'critical' ? 'bg-rose-400' : 'bg-amber-400')} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-neutral-100">{typeLabel[a.type] ?? a.type}</p>
                                            <p className="mt-0.5 text-[11px] text-neutral-400" dir="auto">{a.message}</p>
                                            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-neutral-500">
                                                <span>{timeAgo(a.created_at)}</span>
                                                {a.hostname && <span dir="ltr">{a.hostname}</span>}
                                                {a.license_uuid && (
                                                    <Link href={route('admin.licenses.show', a.license_uuid)} className="text-amber-300 hover:underline" onClick={() => setOpen(false)}>
                                                        مشاهده لایسنس
                                                    </Link>
                                                )}
                                            </p>
                                        </div>
                                        <button onClick={() => ack(a.id)} className="rounded-md p-1 text-neutral-500 hover:bg-white/10 hover:text-emerald-300" title="بررسی شد">
                                            <Check className="size-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="h-px bg-white/[.06]" />
                        <Link
                            href={route('admin.logs.index', { category: 'security', unacked: 1 })}
                            className="block px-4 py-3 text-center text-xs text-amber-300 hover:bg-white/[.03]"
                            onClick={() => setOpen(false)}
                        >
                            همه‌ی هشدارهای بررسی‌نشده{alerts.count > alerts.items.length ? ` (${formatNumber(alerts.count)})` : ''}
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}