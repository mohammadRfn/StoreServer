import { Head, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, Inbox as InboxIcon, RotateCcw, Skull } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { EmptyState } from '@/Components/ui/EmptyState';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { StatCard } from '@/Components/ui/StatCard';
import { Tabs } from '@/Components/ui/Tabs';
import { useCan } from '@/Hooks/useCan';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp } from '@/lib/motion';
import type { Tone } from '@/lib/status';
import { formatDate, formatNumber, timeAgo } from '@/lib/utils';
import type { PageProps, Paginated } from '@/types';

type InboxStatus = 'pending' | 'processing' | 'done' | 'failed' | 'dead';

interface InboxStats {
    mode: 'sync' | 'queue';
    pending: number;
    processing: number;
    failed: number;
    dead: number;
    done: number;
    waiting: number;
    oldest_waiting_at: string | null;
    oldest_waiting_seconds: number | null;
    last_processed_at: string | null;
    worker_seen_at: string | null;
    drain_seen_at: string | null;
    dispatch_job: boolean;
    stalled: boolean;
}

interface InboxRow {
    id: number;
    batch_uuid: string;
    status: InboxStatus;
    attempts: number;
    log_count: number;
    accepted_count: number;
    rejected_count: number;
    rejected_reasons: Record<string, number> | null;
    last_error: string | null;
    next_attempt_at: string | null;
    processed_at: string | null;
    created_at: string;
    license?: { id: number; uuid: string } | null;
    device?: { id: number; hostname: string | null } | null;
}

type Props = PageProps<{ stats: InboxStats; items: Paginated<InboxRow>; filters: { status: string } }>;

const statusMeta: Record<InboxStatus, { label: string; tone: Tone }> = {
    pending: { label: 'در انتظار', tone: 'info' },
    processing: { label: 'در حال پردازش', tone: 'amber' },
    done: { label: 'انجام شد', tone: 'success' },
    failed: { label: 'ناموفق (retry)', tone: 'warning' },
    dead: { label: 'dead', tone: 'danger' },
};

const filterTabs = [
    { value: '', label: 'همه' },
    { value: 'pending', label: 'در انتظار' },
    { value: 'failed', label: 'ناموفق' },
    { value: 'dead', label: 'dead' },
    { value: 'done', label: 'انجام‌شده' },
];

function ageText(seconds: number | null): string {
    if (seconds === null) return '—';
    if (seconds < 60) return `${formatNumber(seconds)} ثانیه`;
    if (seconds < 3600) return `${formatNumber(Math.floor(seconds / 60))} دقیقه`;
    return `${formatNumber(Math.floor(seconds / 3600))} ساعت`;
}

export default function LogsInbox({ stats, items, filters }: Props) {
    const { can } = useCan();
    const [confirmAll, setConfirmAll] = useState(false);

    const retryOne = (id: number) => router.post(route('admin.logs.inbox.retry', id), {}, { preserveScroll: true });
    const retryAll = () => router.post(route('admin.logs.inbox.retry-dead'), {}, { preserveScroll: true, onFinish: () => setConfirmAll(false) });
    const setStatus = (status: string) => router.get(route('admin.logs.inbox'), status ? { status } : {}, { preserveState: true, replace: true });

    const lastActivity = stats.worker_seen_at && stats.drain_seen_at ? (stats.worker_seen_at > stats.drain_seen_at ? stats.worker_seen_at : stats.drain_seen_at) : (stats.worker_seen_at ?? stats.drain_seen_at);

    return (
        <>
            <Head title="صف ورودی لاگ اپ‌ها" />
            <PageHeader
                title="صف ورودی لاگ اپ‌ها"
                description="دسته‌های لاگی که سرور دریافت کرده و منتظر پردازش (درج، بررسی زنجیره‌ی هش و هشدار) هستند."
                badge={<Badge tone={stats.mode === 'queue' ? 'success' : 'neutral'} dot>{stats.mode === 'queue' ? 'حالت صف (async)' : 'حالت همزمان (sync)'}</Badge>}
                actions={can('log.view') && stats.dead > 0 && (
                    <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmAll(true)}>
                        retry همه‌ی dead ها
                    </Button>
                )}
            />

            {stats.stalled && (
                <motion.div variants={fadeUp} className="mb-4 flex items-start gap-2 rounded-xl bg-amber-400/10 p-4 text-sm text-amber-200 ring-1 ring-amber-400/25">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>دسته‌ها در صف انباشته شده‌اند. بررسی کنید دستور <span dir="ltr" className="font-mono">client-logs:process-inbox</span> در scheduler (یا worker صف) در حال اجراست.</p>
                </motion.div>
            )}

            <motion.div variants={fadeUp} className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="در انتظار" value={stats.pending} icon={InboxIcon} tone="sky" />
                <StatCard label="ناموفق (در حال retry)" value={stats.failed} icon={AlertTriangle} tone="amber" />
                <StatCard label="dead" value={stats.dead} icon={Skull} tone="rose" />
                <StatCard label="انجام‌شده" value={stats.done} icon={CheckCircle2} tone="emerald" />
            </motion.div>

            <motion.div variants={fadeUp} className="mb-4">
                <Card>
                    <CardHeader title="سلامت پردازش" />
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <dt className="text-xs text-neutral-500">قدیمی‌ترین دسته‌ی منتظر</dt>
                            <dd className="mt-1 flex items-center gap-1.5 text-neutral-100"><Clock className="size-3.5 text-neutral-500" />{ageText(stats.oldest_waiting_seconds)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-neutral-500">آخرین پردازش موفق</dt>
                            <dd className="mt-1 text-neutral-100">{stats.last_processed_at ? timeAgo(stats.last_processed_at) : '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-neutral-500">آخرین اجرای پردازشگر (دستور/worker)</dt>
                            <dd className="mt-1 text-neutral-100">{lastActivity ? timeAgo(lastActivity) : 'تاکنون دیده نشده'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-neutral-500">dispatch job به صف</dt>
                            <dd className="mt-1 text-neutral-100">{stats.dispatch_job ? 'فعال' : 'غیرفعال (فقط دستور scheduler)'}</dd>
                        </div>
                    </dl>
                </Card>
            </motion.div>

            <motion.div variants={fadeUp} className="mb-4">
                <Tabs id="inbox-tabs" value={filters.status} onChange={setStatus} tabs={filterTabs} />
            </motion.div>

            <Card padded={false}>
                {items.data.length === 0 ? (
                    <EmptyState title="ردیفی پیدا نشد" description="در این وضعیت دسته‌ای در صف ورودی وجود ندارد." icon={<InboxIcon className="size-8" />} />
                ) : (
                    <ul className="divide-y divide-white/[.05]">
                        {items.data.map((r) => (
                            <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone={statusMeta[r.status].tone} size="sm">{statusMeta[r.status].label}</Badge>
                                        <span className="font-mono text-xs text-neutral-400" dir="ltr">{r.batch_uuid}</span>
                                    </div>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-neutral-500">
                                        <span>{formatNumber(r.log_count)} لاگ</span>
                                        {r.status === 'done' && <span>پذیرفته: {formatNumber(r.accepted_count)}{r.rejected_count > 0 ? ` | ردشده: ${formatNumber(r.rejected_count)}` : ''}</span>}
                                        {r.attempts > 0 && <span>تلاش: {formatNumber(r.attempts)}</span>}
                                        {r.device?.hostname && <span dir="ltr">{r.device.hostname}</span>}
                                        <span>{formatDate(r.created_at)}</span>
                                        {r.status === 'failed' && r.next_attempt_at && <span>تلاش بعدی: {timeAgo(r.next_attempt_at)}</span>}
                                    </p>
                                    {r.rejected_reasons && Object.keys(r.rejected_reasons).length > 0 && (
                                        <p className="mt-1 text-[11px] text-amber-300" dir="ltr">{Object.entries(r.rejected_reasons).map(([k, v]) => `${k}: ${v}`).join('  ·  ')}</p>
                                    )}
                                    {r.last_error && r.status !== 'done' && <p className="mt-1 break-all text-[11px] text-rose-300" dir="ltr">{r.last_error}</p>}
                                </div>
                                {can('log.view') && (r.status === 'dead' || r.status === 'failed') && (
                                    <Button size="xs" variant="secondary" icon={<RotateCcw className="size-3.5" />} onClick={() => retryOne(r.id)}>retry</Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="px-4 pb-4"><Pagination paginator={items} /></div>
            </Card>

            <ConfirmDialog
                open={confirmAll}
                onClose={() => setConfirmAll(false)}
                onConfirm={retryAll}
                title="retry همه‌ی دسته‌های dead؟"
                description={`${formatNumber(stats.dead)} دسته دوباره به صف پردازش برمی‌گردند.`}
                confirmLabel="retry همه"
                tone="primary"
            />
        </>
    );
}

LogsInbox.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;