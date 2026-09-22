import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { StatusBadge } from '@/Components/ui/Badge';
import { Card } from '@/Components/ui/Card';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { PageHeader } from '@/Components/ui/PageHeader';
import { Pagination } from '@/Components/ui/Pagination';
import { SearchInput } from '@/Components/ui/SearchInput';
import { useDebouncedFilters } from '@/Hooks/useDebouncedFilters';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp } from '@/lib/motion';
import { licenseStatus } from '@/lib/status';
import { cn, formatNumber, isOnline, timeAgo } from '@/lib/utils';
import type { Device, PageProps, Paginated } from '@/types';

type Props = PageProps<{ devices: Paginated<Device>; filters: { q?: string } }>;

export default function DevicesIndex({ devices, filters }: Props) {
    const { values, set } = useDebouncedFilters(route('admin.devices.index'), { q: filters.q ?? '' });
    const online = devices.data.filter((d) => isOnline(d.last_heartbeat_at)).length;

    const columns: Column<Device>[] = [
        {
            key: 'device',
            header: 'دستگاه',
            render: (d) => {
                const on = isOnline(d.last_heartbeat_at);
                return (
                    <div className="flex items-center gap-3">
                        <span className={cn('grid size-9 place-items-center rounded-xl ring-1', on ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' : 'bg-white/[.04] text-neutral-500 ring-white/10')}>
                            {on ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
                        </span>
                        <div>
                            <p className="font-medium text-white">{d.hostname ?? 'بدون نام'}</p>
                            <p className="flex items-center gap-1 text-[11px] text-neutral-500">
                                <Mono>{d.fingerprint.slice(0, 16)}</Mono>
                                <CopyButton value={d.fingerprint} />
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'license',
            header: 'لایسنس / مشتری',
            render: (d) =>
                d.license ? (
                    <div>
                        <Link href={route('admin.licenses.show', d.license.uuid)} onClick={(e) => e.stopPropagation()} className="text-sm text-amber-300 hover:underline">
                            <Mono className="text-amber-300">{d.license.uuid.slice(0, 8)}</Mono>
                        </Link>
                        <p className="text-xs text-neutral-500">{d.license.customer?.name} · {d.license.plan?.name}</p>
                    </div>
                ) : '—',
        },
        { key: 'status', header: 'وضعیت لایسنس', hideBelow: 'md', render: (d) => d.license ? <StatusBadge status={d.license.status} map={licenseStatus} size="sm" /> : null },
        { key: 'version', header: 'نسخه', hideBelow: 'md', render: (d) => <Mono>v{d.app_version ?? '?'}</Mono> },
        { key: 'os', header: 'سیستم‌عامل', hideBelow: 'lg', render: (d) => <span className="text-xs text-neutral-400">{[d.os, d.os_version].filter(Boolean).join(' ') || '—'}</span> },
        { key: 'ip', header: 'IP', hideBelow: 'xl', render: (d) => <Mono>{d.last_ip ?? '—'}</Mono> },
        { key: 'hb', header: 'آخرین ضربان', render: (d) => <span className={cn('text-xs', isOnline(d.last_heartbeat_at) ? 'text-emerald-300' : 'text-neutral-400')}>{timeAgo(d.last_heartbeat_at)}</span> },
    ];

    return (
        <>
            <Head title="دستگاه‌ها" />
            <PageHeader title="دستگاه‌ها" description={`${formatNumber(devices.total)} دستگاه ثبت‌شده · ${formatNumber(online)} آنلاین در این صفحه`} />
            <Card padded={false}>
                <motion.div variants={fadeUp} className="border-b border-white/[.06] p-4">
                    <SearchInput value={values.q} onChange={(v) => set('q', v)} placeholder="جستجو بر اساس اثر انگشت، نام دستگاه یا IP…" />
                </motion.div>
                <DataTable columns={columns} rows={devices.data} rowKey={(d) => d.id} onRowClick={(d) => router.visit(route('admin.devices.show', d.id))} emptyTitle="دستگاهی یافت نشد" />
                <div className="px-4 pb-4"><Pagination paginator={devices} /></div>
            </Card>
        </>
    );
}

DevicesIndex.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
