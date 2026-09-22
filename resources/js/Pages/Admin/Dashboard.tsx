import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Activity, ArrowLeft, KeyRound, MonitorSmartphone, Package, ShieldAlert, Ticket, UsersRound } from 'lucide-react';
import { StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { Mono } from '@/Components/ui/CopyButton';
import { EmptyState } from '@/Components/ui/EmptyState';
import { PageHeader } from '@/Components/ui/PageHeader';
import { StatCard } from '@/Components/ui/StatCard';
import AdminLayout from '@/Layouts/AdminLayout';
import { EASE_OUT_EXPO, listItem, stagger } from '@/lib/motion';
import { activationStatus, licenseStatus } from '@/lib/status';
import { formatNumber, timeAgo } from '@/lib/utils';
import type { DashboardStats, PageProps } from '@/types';

/**
 * Props are optional: the current AuthController@dashboard renders without data.
 * See README for the suggested `stats` payload to pass from the controller.
 */
type Props = PageProps<{ stats?: DashboardStats }>;

const emptyStats: DashboardStats = {
    licenses: { total: 0, active: 0, suspended: 0, expiring_soon: 0 },
    customers: { total: 0, active: 0 },
    devices: { total: 0, online: 0 },
    activation_requests: { pending: 0 },
    patches: { published: 0, draft: 0 },
    security_events_24h: 0,
};

export default function Dashboard({ stats = emptyStats, auth }: Props) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'صبح بخیر' : hour < 18 ? 'ظهر بخیر' : 'شب بخیر';

    return (
        <>
            <Head title="داشبورد" />
            <PageHeader
                title={`${greeting}، ${auth.user?.name?.split(' ')[0] ?? 'ادمین'} 👋`}
                description="نمای کلی وضعیت سرور لایسنس در یک نگاه"
                actions={
                    <>
                        <Link href={route('admin.activation-requests.index', { status: 'pending' })}>
                            <Button variant="secondary" icon={<Ticket className="size-4" />}>
                                درخواست‌های در انتظار
                                {stats.activation_requests.pending > 0 && <span className="rounded-md bg-amber-400 px-1.5 text-[11px] font-bold text-neutral-950">{formatNumber(stats.activation_requests.pending)}</span>}
                            </Button>
                        </Link>
                        <Link href={route('admin.licenses.index')}>
                            <Button icon={<KeyRound className="size-4" />}>صدور لایسنس</Button>
                        </Link>
                    </>
                }
            />

            <motion.div variants={stagger(0.06)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="لایسنس‌های فعال" value={stats.licenses.active} icon={KeyRound} tone="amber" hint={`از ${formatNumber(stats.licenses.total)} لایسنس`} />
                <StatCard label="دستگاه‌های آنلاین" value={stats.devices.online} icon={MonitorSmartphone} tone="emerald" hint={`از ${formatNumber(stats.devices.total)} دستگاه`} />
                <StatCard label="مشتریان فعال" value={stats.customers.active} icon={UsersRound} tone="sky" hint={`مجموع ${formatNumber(stats.customers.total)}`} />
                <StatCard label="رویداد امنیتی (۲۴س)" value={stats.security_events_24h} icon={ShieldAlert} tone={stats.security_events_24h > 0 ? 'rose' : 'neutral'} hint="نقض امضا / replay / نرخ" />
            </motion.div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Heartbeat chart */}
                <Card className="xl:col-span-2">
                    <CardHeader title="ضربان دستگاه‌ها" description="تعداد heartbeat دریافتی در ۱۴ روز گذشته" action={<Activity className="size-5 text-neutral-500" />} />
                    <HeartbeatChart data={stats.heartbeat_series ?? []} />
                </Card>

                {/* Health */}
                <Card>
                    <CardHeader title="وضعیت لایسنس‌ها" />
                    <div className="space-y-4">
                        <Meter label="فعال" value={stats.licenses.active} total={stats.licenses.total} color="bg-emerald-400" />
                        <Meter label="معلق" value={stats.licenses.suspended} total={stats.licenses.total} color="bg-orange-400" />
                        <Meter label="در آستانه انقضا (۱۴ روز)" value={stats.licenses.expiring_soon} total={stats.licenses.total} color="bg-amber-400" />
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <MiniStat icon={Package} label="پچ منتشرشده" value={stats.patches.published} />
                        <MiniStat icon={Package} label="پچ پیش‌نویس" value={stats.patches.draft} />
                    </div>
                </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                    <CardHeader
                        title="آخرین لایسنس‌ها"
                        action={
                            <Link href={route('admin.licenses.index')} className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200">
                                همه <ArrowLeft className="size-3.5" />
                            </Link>
                        }
                    />
                    {stats.recent_licenses?.length ? (
                        <motion.ul variants={stagger(0.05)} initial="hidden" animate="show" className="divide-y divide-white/[.05]">
                            {stats.recent_licenses.map((l) => (
                                <motion.li key={l.id} variants={listItem}>
                                    <Link href={route('admin.licenses.show', l.uuid)} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition hover:bg-white/[.03]">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-white">{l.customer?.name}</p>
                                            <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                                                <Mono>{l.uuid.slice(0, 8)}</Mono> · {l.plan?.name} · {timeAgo(l.created_at)}
                                            </p>
                                        </div>
                                        <StatusBadge status={l.status} map={licenseStatus} size="sm" />
                                    </Link>
                                </motion.li>
                            ))}
                        </motion.ul>
                    ) : (
                        <EmptyState title="هنوز لایسنسی صادر نشده" description="برای نمایش داده در داشبورد، prop `stats` را از کنترلر ارسال کنید." />
                    )}
                </Card>

                <Card>
                    <CardHeader
                        title="درخواست‌های فعال‌سازی اخیر"
                        action={
                            <Link href={route('admin.activation-requests.index')} className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200">
                                همه <ArrowLeft className="size-3.5" />
                            </Link>
                        }
                    />
                    {stats.recent_requests?.length ? (
                        <motion.ul variants={stagger(0.05)} initial="hidden" animate="show" className="divide-y divide-white/[.05]">
                            {stats.recent_requests.map((r) => (
                                <motion.li key={r.id} variants={listItem} className="flex items-center justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white">{r.customer_name ?? 'بدون نام'}</p>
                                        <p className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                                            <Mono>{r.fingerprint.slice(0, 12)}</Mono> · v{r.app_version} · {timeAgo(r.created_at)}
                                        </p>
                                    </div>
                                    <StatusBadge status={r.status} map={activationStatus} size="sm" />
                                </motion.li>
                            ))}
                        </motion.ul>
                    ) : (
                        <EmptyState title="درخواستی وجود ندارد" />
                    )}
                </Card>
            </div>
        </>
    );
}

Dashboard.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* ------------------------------ Sub components --------------------------- */

function Meter({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-neutral-400">{label}</span>
                <span className="tabular-nums text-neutral-300">
                    {formatNumber(value)} <span className="text-neutral-600">({formatNumber(pct)}٪)</span>
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.3 }} className={`h-full rounded-full ${color}`} />
            </div>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number }) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-white/[.03] p-3 ring-1 ring-white/[.06]">
            <Icon className="size-4 text-neutral-500" />
            <div>
                <p className="text-lg font-bold leading-none text-white">{formatNumber(value)}</p>
                <p className="mt-1 text-[11px] text-neutral-500">{label}</p>
            </div>
        </div>
    );
}

function HeartbeatChart({ data }: { data: { day: string; count: number }[] }) {
    if (data.length === 0) {
        return <EmptyState title="داده‌ای برای نمایش نیست" description="سری زمانی `heartbeat_series` را در prop آمار ارسال کنید." />;
    }
    const max = Math.max(...data.map((d) => d.count), 1);
    const W = 600;
    const H = 180;
    const pad = 8;
    const pts = data.map((d, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
        const y = H - pad - (d.count / max) * (H - pad * 2);
        return [x, y] as const;
    });
    const path = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
    const area = `${path} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="hb-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((f) => (
                    <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,.05)" strokeDasharray="4 6" />
                ))}
                <motion.path d={area} fill="url(#hb-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} />
                <motion.path d={path} fill="none" stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: EASE_OUT_EXPO, delay: 0.2 }} />
                {pts.map(([x, y], i) => (
                    <motion.circle key={i} cx={x} cy={y} r={3.5} fill="#0a0a0a" stroke="#fbbf24" strokeWidth={2} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 + i * 0.05, type: 'spring', stiffness: 400, damping: 20 }} />
                ))}
            </svg>
            <div className="mt-2 flex justify-between text-[11px] text-neutral-600">
                <span>{data[0].day}</span>
                <span>{data[Math.floor(data.length / 2)].day}</span>
                <span>{data[data.length - 1].day}</span>
            </div>
        </div>
    );
}
