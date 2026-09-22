import { Head, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Download, RotateCcw, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card } from '@/Components/ui/Card';
import { Mono } from '@/Components/ui/CopyButton';
import { EmptyState } from '@/Components/ui/EmptyState';
import { Input } from '@/Components/ui/Field';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { SearchInput } from '@/Components/ui/SearchInput';
import { Tabs } from '@/Components/ui/Tabs';
import { useCan } from '@/Hooks/useCan';
import { useDebouncedFilters } from '@/Hooks/useDebouncedFilters';
import AdminLayout from '@/Layouts/AdminLayout';
import { EASE_OUT_EXPO, fadeUp } from '@/lib/motion';
import { logCategory, type Tone } from '@/lib/status';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import type { LogCategory, LogRow, PageProps, Paginated } from '@/types';

type Props = PageProps<{ category: LogCategory; categories: LogCategory[]; logs: Paginated<LogRow>; filters: { q?: string; from?: string; to?: string; category?: string } }>;

export default function LogsIndex({ category, categories, logs, filters }: Props) {
    const { can } = useCan();
    const { values, set, isDirty } = useDebouncedFilters(route('admin.logs.index'), { category, q: filters.q ?? '', from: filters.from ?? '', to: filters.to ?? '' });
    const setCategory = (c: LogCategory) => router.get(route('admin.logs.index'), { category: c }, { preserveState: false, replace: true });

    const exportUrl = route('admin.logs.export', Object.fromEntries(Object.entries(values).filter(([, v]) => v)));

    return (
        <>
            <Head title="لاگ‌ها" />
            <PageHeader title="لاگ‌ها و رویدادها" description={logCategory[category]?.description} actions={can('log.export') && <a href={exportUrl} target="_blank" rel="noreferrer"><Button variant="secondary" icon={<Download className="size-4" />}>خروجی CSV</Button></a>} />

            <motion.div variants={fadeUp} className="mb-4">
                <Tabs id="log-tabs" value={category} onChange={setCategory} tabs={categories.map((c) => ({ value: c, label: logCategory[c]?.label ?? c }))} />
            </motion.div>

            <Card padded={false}>
                <motion.div variants={fadeUp} className="flex flex-col gap-3 border-b border-white/[.06] p-4 lg:flex-row lg:items-center">
                    <div className="flex-1"><SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder={`جستجو در لاگ‌های ${logCategory[category]?.label ?? ''}…`} /></div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={values.from} onChange={(e) => set('from', e.target.value)} dir="ltr" className="w-40" />
                        <span className="text-xs text-neutral-500">تا</span>
                        <Input type="date" value={values.to} onChange={(e) => set('to', e.target.value)} dir="ltr" className="w-40" />
                        {isDirty && (values.q || values.from || values.to) && <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" />} onClick={() => { set('q', ''); set('from', ''); set('to', ''); }} />}
                    </div>
                </motion.div>

                {logs.data.length === 0 ? (
                    <EmptyState icon={<ScrollText className="size-6" />} title="لاگی یافت نشد" description="بازه زمانی یا عبارت جستجو را تغییر دهید." />
                ) : (
                    <ul className="divide-y divide-white/[.05]">
                        {logs.data.map((row, i) => <LogRowItem key={row.id} row={row} category={category} index={i} />)}
                    </ul>
                )}
                <div className="px-4 pb-4"><Pagination paginator={logs} /></div>
            </Card>
        </>
    );
}

LogsIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

/* -------------------------------------------------------------------------- */

const severityTone: Record<string, Tone> = { critical: 'danger', error: 'danger', high: 'danger', warning: 'warning', medium: 'warning', notice: 'info', info: 'info', low: 'neutral', debug: 'neutral' };

function summarize(row: LogRow, category: LogCategory): { title: string; subtitle?: string; tone: Tone; tag?: string } {
    const s = (k: string) => (typeof row[k] === 'string' || typeof row[k] === 'number' ? String(row[k]) : undefined);
    switch (category) {
        case 'audit': return { title: s('description') ?? s('action') ?? '', subtitle: [s('user_name'), s('entity_type') && `${s('entity_type')}#${s('entity_id') ?? ''}`, s('ip')].filter(Boolean).join(' · '), tone: 'amber', tag: s('action') };
        case 'license': return { title: s('message') ?? s('event') ?? '', subtitle: [s('license_id') && `لایسنس #${s('license_id')}`, s('ip')].filter(Boolean).join(' · '), tone: severityTone[s('severity') ?? ''] ?? 'info', tag: s('event') };
        case 'heartbeat': return { title: `ضربان · v${s('app_version') ?? '?'} · ${s('license_status') ?? ''}`, subtitle: [s('ip'), s('duration_ms') && `${s('duration_ms')}ms`, row.token_refreshed ? 'توکن تازه شد' : undefined].filter(Boolean).join(' · '), tone: 'success' };
        case 'device': return { title: s('message') ?? s('event') ?? '', subtitle: [s('device_id') && `دستگاه #${s('device_id')}`, s('ip')].filter(Boolean).join(' · '), tone: 'info', tag: s('event') };
        case 'security': return { title: s('message') ?? s('type') ?? '', subtitle: [s('endpoint'), s('fingerprint')?.slice(0, 12), s('ip')].filter(Boolean).join(' · '), tone: severityTone[s('severity') ?? ''] ?? 'danger', tag: s('type') };
        case 'api': { const code = Number(s('status_code') ?? 0); return { title: `${s('method') ?? ''} ${s('path') ?? ''}`, subtitle: [s('error_code'), s('ip'), s('duration_ms') && `${s('duration_ms')}ms`].filter(Boolean).join(' · '), tone: code >= 500 ? 'danger' : code >= 400 ? 'warning' : 'success', tag: String(code) }; }
        case 'error': return { title: s('message') ?? '', subtitle: [s('exception_class'), s('file') && `${s('file')}:${s('line') ?? ''}`].filter(Boolean).join(' · '), tone: 'danger', tag: s('level') };
        case 'patch': return { title: `دانلود پچ #${s('patch_id') ?? ''} · ${s('status') ?? ''}`, subtitle: [s('ip'), s('bytes_sent') && `${s('bytes_sent')} B`, s('range_header')].filter(Boolean).join(' · '), tone: s('status') === 'completed' ? 'success' : 'info' };
        default: return { title: JSON.stringify(row).slice(0, 80), tone: 'neutral' };
    }
}

function LogRowItem({ row, category, index }: { row: LogRow; category: LogCategory; index: number }) {
    const [open, setOpen] = useState(false);
    const meta = summarize(row, category);
    const details = Object.entries(row).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k));
    return (
        <motion.li initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO, delay: Math.min(index * 0.02, 0.3) }}>
            <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 px-4 py-3 text-right transition hover:bg-white/[.02]">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', { neutral: 'bg-neutral-500', success: 'bg-emerald-400', warning: 'bg-orange-400', danger: 'bg-rose-400', info: 'bg-sky-400', amber: 'bg-amber-400', violet: 'bg-violet-400' }[meta.tone])} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm text-neutral-100">{meta.title}</p>{meta.tag && <Badge size="sm" tone={meta.tone}><span className="font-mono">{meta.tag}</span></Badge>}</div>
                    {meta.subtitle && <p className="mt-0.5 truncate text-xs text-neutral-500" dir="auto">{meta.subtitle}</p>}
                </div>
                <div className="shrink-0 text-left"><p className="text-xs text-neutral-400">{timeAgo(row.created_at)}</p><p className="text-[10px] text-neutral-600">{formatDate(row.created_at)}</p></div>
                <motion.span animate={{ rotate: open ? 180 : 0 }} className="mt-1 text-neutral-600"><ChevronDown className="size-4" /></motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO }} className="overflow-hidden">
                        <dl className="mx-4 mb-3 grid grid-cols-1 gap-x-6 gap-y-2 rounded-xl bg-neutral-950/60 p-4 ring-1 ring-white/[.06] sm:grid-cols-2 lg:grid-cols-3">
                            {details.map(([k, v]) => (
                                <div key={k} className="min-w-0"><dt className="font-mono text-[10px] text-neutral-500">{k}</dt><dd className="mt-0.5 break-all text-xs text-neutral-300" dir="auto">{v === null || v === undefined ? <span className="text-neutral-600">null</span> : typeof v === 'object' ? <Mono className="whitespace-pre-wrap text-[11px]">{JSON.stringify(v, null, 1)}</Mono> : String(v)}</dd></div>
                            ))}
                        </dl>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.li>
    );
}
