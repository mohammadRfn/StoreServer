import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Ban, Cpu, HardDrive, MemoryStick, Network, Package, PauseCircle, PlayCircle, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Badge, StatusBadge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardHeader } from '@/Components/ui/Card';
import { ConfirmDialog } from '@/Components/ui/ConfirmDialog';
import { CopyButton, Mono } from '@/Components/ui/CopyButton';
import { DataTable, type Column } from '@/Components/ui/DataTable';
import { KeyValue } from '@/Components/ui/KeyValue';
import { PageHeader } from '@/Components/ui/PageHeader';
import { useCan } from '@/Hooks/useCan';
import AdminLayout from '@/Layouts/AdminLayout';
import { fadeUp } from '@/lib/motion';
import { devicePatchState, licenseStatus } from '@/lib/status';
import { cn, formatDate, formatNumber, isOnline, timeAgo } from '@/lib/utils';
import type { Device, DevicePatchStatus, PageProps } from '@/types';

type Props = PageProps<{ device: Device }>;

type Action = 'suspend' | 'reactivate' | 'revoke' | null;

export default function DeviceShow({ device }: Props) {
    const { can } = useCan();
    const [action, setAction] = useState<Action>(null);
    const [busy, setBusy] = useState(false);
    const on = isOnline(device.last_heartbeat_at);
    const license = device.license;

    const post = (name: string, data: Record<string, string> = {}) => {
        if (!license) return;
        setBusy(true);
        router.post(route(name, license.uuid), data, { preserveScroll: true, onFinish: () => { setBusy(false); setAction(null); } });
    };
    const columns: Column<DevicePatchStatus>[] = [
        { key: 'patch', header: 'پچ', render: (s) => <div><Mono className="text-amber-200">{s.patch?.patch_code}</Mono><p className="text-xs text-neutral-500">{s.patch?.title} → v{s.patch?.to_version}</p></div> },
        { key: 'status', header: 'وضعیت', render: (s) => <div className="flex items-center gap-2"><StatusBadge status={s.status} map={devicePatchState} size="sm" />{s.is_blocked && <Badge tone="danger" size="sm">مسدود</Badge>}</div> },
        { key: 'attempts', header: 'تلاش / خطا', hideBelow: 'md', render: (s) => <span className="text-xs tabular-nums text-neutral-300">{formatNumber(s.attempts)} / <span className={s.failure_count > 0 ? 'text-rose-300' : ''}>{formatNumber(s.failure_count)}</span></span> },
        { key: 'ver', header: 'نسخه', hideBelow: 'lg', render: (s) => <Mono>{s.version_before ?? '?'} → {s.version_after ?? '?'}</Mono> },
        { key: 'applied', header: 'اعمال', hideBelow: 'lg', render: (s) => <span className="text-xs text-neutral-400">{formatDate(s.applied_at)}</span> },
        { key: 'err', header: 'خطا', hideBelow: 'xl', render: (s) => s.error_message ? <span className="max-w-xs truncate text-xs text-rose-300" title={s.error_message}>{s.error_message}</span> : null },
    ];

    return (
        <>
            <Head title={`دستگاه ${device.hostname ?? device.fingerprint.slice(0, 8)}`} />
            <PageHeader
                breadcrumbs={[{ label: 'دستگاه‌ها', href: route('admin.devices.index') }, { label: device.hostname ?? device.fingerprint.slice(0, 8) }]}
                title={device.hostname ?? 'دستگاه بدون نام'}
                badge={<Badge tone={on ? 'success' : 'neutral'} dot pulse={on}>{on ? 'آنلاین' : 'آفلاین'}</Badge>}
                description={<span className="flex items-center gap-1"><Mono>{device.fingerprint}</Mono><CopyButton value={device.fingerprint} /></span>}
            />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card>
                        <CardHeader title="مشخصات سخت‌افزار" action={<Cpu className="size-5 text-neutral-500" />} />
                        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Spec icon={Cpu} label="CPU" value={device.cpu ?? '—'} />
                            <Spec icon={MemoryStick} label="RAM" value={device.ram_mb ? `${formatNumber(Math.round(device.ram_mb / 1024))} GB` : '—'} />
                            <Spec icon={HardDrive} label="دیسک" value={device.disk_serial ?? '—'} mono />
                            <Spec icon={Network} label="MAC" value={device.mac_address ?? '—'} mono />
                        </div>
                        <KeyValue columns={3} items={[
                            { label: 'سیستم‌عامل', value: [device.os, device.os_version].filter(Boolean).join(' ') || '—' },
                            { label: 'سریال مادربرد', value: device.motherboard_serial ?? '—', mono: true },
                            { label: 'منطقه زمانی', value: device.timezone ?? '—', mono: true },
                            { label: 'نسخه برنامه', value: `${device.app_version ?? '?'} (${device.app_version_code ?? '?'})`, mono: true },
                            { label: 'آخرین IP', value: device.last_ip ?? '—', mono: true },
                            { label: 'اولین اتصال', value: formatDate(device.first_seen_at) },
                        ]} />
                    </Card>
                    <Card padded={false}>
                        <div className="p-5 pb-0"><CardHeader title="وضعیت پچ‌ها" description="پچ‌هایی که به این دستگاه پیشنهاد یا روی آن اعمال شده‌اند" action={<Package className="size-5 text-neutral-500" />} /></div>
                        <DataTable columns={columns} rows={device.patch_statuses ?? []} rowKey={(s) => s.id} emptyTitle="هنوز پچی به این دستگاه ارائه نشده" dense />
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="لایسنس" />
                        {license ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Link href={route('admin.licenses.show', license.uuid)} className="text-amber-300 hover:underline"><Mono className="text-amber-300">{license.uuid.slice(0, 13)}…</Mono></Link>
                                    <StatusBadge status={license.status} map={licenseStatus} size="sm" />
                                </div>
                                <KeyValue columns={1} items={[
                                    { label: 'مشتری', value: license.customer?.name },
                                    { label: 'پلن', value: license.plan?.name },
                                    { label: 'انقضا', value: license.duration_type === 'permanent' ? 'دائمی' : formatDate(license.expires_at, false) },
                                ]} />
                                <div className="flex flex-wrap gap-2 border-t border-white/[.06] pt-4">
                                    {can('license.suspend') && license.status === 'active' && (
                                        <Button size="sm" variant="outline" icon={<PauseCircle className="size-4" />} onClick={() => setAction('suspend')}>
                                            غیرفعال‌سازی ریموت
                                        </Button>
                                    )}
                                    {can('license.suspend') && license.status === 'suspended' && (
                                        <Button size="sm" variant="success" icon={<PlayCircle className="size-4" />} onClick={() => setAction('reactivate')}>
                                            فعال‌سازی مجدد
                                        </Button>
                                    )}
                                    {can('license.revoke') && license.status !== 'revoked' && (
                                        <Button size="sm" variant="danger" icon={<Ban className="size-4" />} onClick={() => setAction('revoke')}>
                                            ابطال
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : <p className="text-sm text-neutral-500">بدون لایسنس</p>}
                    </Card>
                    <Card>
                        <CardHeader title="ضربان" action={on ? <Wifi className="size-5 text-emerald-400" /> : <WifiOff className="size-5 text-neutral-500" />} />
                        <div className={cn('rounded-xl p-4 text-center ring-1', on ? 'bg-emerald-500/[.06] ring-emerald-500/20' : 'bg-white/[.02] ring-white/[.06]')}>
                            <p className={cn('text-2xl font-bold', on ? 'text-emerald-300' : 'text-neutral-300')}>{timeAgo(device.last_heartbeat_at)}</p>
                            <p className="mt-1 text-xs text-neutral-500">{formatDate(device.last_heartbeat_at)}</p>
                        </div>
                    </Card>
                    {device.system_info && Object.keys(device.system_info).length > 0 && (
                        <Card>
                            <CardHeader title="اطلاعات سیستم (خام)" />
                            <motion.pre variants={fadeUp} dir="ltr" className="max-h-72 overflow-auto rounded-xl bg-neutral-950 p-3 text-left font-mono text-[11px] leading-5 text-neutral-400 ring-1 ring-white/[.06]">{JSON.stringify(device.system_info, null, 2)}</motion.pre>
                        </Card>
                    )}
                </div>
            </div>

            {license && (
                <>
                    <ConfirmDialog
                        open={action === 'suspend'}
                        onClose={() => setAction(null)}
                        onConfirm={(reason) => post('admin.licenses.suspend', { reason })}
                        loading={busy}
                        withReason
                        title="غیرفعال‌سازی ریموت این دستگاه"
                        description="نرم‌افزار روی این دستگاه از اولین heartbeat بعدی قفل می‌شود. این عمل قابل بازگشت است."
                        confirmLabel="غیرفعال کن"
                        tone="primary"
                    />
                    <ConfirmDialog
                        open={action === 'reactivate'}
                        onClose={() => setAction(null)}
                        onConfirm={() => post('admin.licenses.reactivate')}
                        loading={busy}
                        title="فعال‌سازی مجدد"
                        description="لایسنس به وضعیت فعال بازمی‌گردد و نرم‌افزار در heartbeat بعدی باز می‌شود."
                        confirmLabel="فعال کن"
                        tone="success"
                    />
                    <ConfirmDialog
                        open={action === 'revoke'}
                        onClose={() => setAction(null)}
                        onConfirm={(reason) => post('admin.licenses.revoke', { reason })}
                        loading={busy}
                        withReason
                        title="ابطال دائمی لایسنس این دستگاه"
                        description="این عمل غیرقابل بازگشت است. توکن‌های صادرشده بی‌اعتبار می‌شوند و دستگاه دیگر قادر به فعال‌سازی نخواهد بود."
                        confirmLabel="ابطال کن"
                    />
                </>
            )}
        </>
    );
}

DeviceShow.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;

function Spec({ icon: Icon, label, value, mono }: { icon: typeof Cpu; label: string; value: string; mono?: boolean }) {
    return (
        <div className="rounded-xl bg-white/[.03] p-3 ring-1 ring-white/[.06]">
            <Icon className="size-4 text-neutral-500" />
            <p className="mt-2 text-[11px] text-neutral-500">{label}</p>
            <p className={cn('mt-0.5 truncate text-sm text-white', mono && 'font-mono text-xs')} dir={mono ? 'ltr' : undefined} title={value}>{value}</p>
        </div>
    );
}