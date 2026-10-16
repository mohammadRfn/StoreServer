import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { formatDate, formatNumber } from '@/lib/utils';
import { evidenceSource, evidenceVerified, type EvidenceIntegrity, type EvidenceReport } from '@/types/evidence';
import type { PageProps } from '@/types';

type Props = PageProps<{ license: { uuid: string; status: string }; report: EvidenceReport; integrity: EvidenceIntegrity }>;

const PRINT_TIMELINE_LIMIT = 400;

/** نسخه‌ی چاپی A4 (روشن، بدون منوی پنل). با «ذخیره به‌صورت PDF» مرورگر خروجی PDF می‌دهد. */
export default function EvidencePrint({ report, integrity }: Props) {
    const ok = evidenceVerified(integrity);
    const r = report;

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('auto') === '1') {
            const t = window.setTimeout(() => window.print(), 600);
            return () => window.clearTimeout(t);
        }
    }, []);

    return (
        <>
            <Head title={`گزارش مدرک ${r.meta.report_id.slice(0, 8)}`} />
            <style>{`
                html, body { background: #fff !important; color: #111 !important; }
                @page { size: A4; margin: 14mm 12mm; }
                @media print { .no-print { display: none !important; } .avoid { break-inside: avoid; } }
                .ev table { width: 100%; border-collapse: collapse; font-size: 11px; }
                .ev th, .ev td { border: 1px solid #d4d4d8; padding: 4px 6px; text-align: right; vertical-align: top; }
                .ev th { background: #f4f4f5; font-weight: 700; }
                .ev tr { break-inside: avoid; }
                .ev h2 { font-size: 14px; font-weight: 800; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #111; }
                .ev .mono { font-family: ui-monospace, Consolas, monospace; direction: ltr; unicode-bidi: embed; word-break: break-all; }
            `}</style>

            <div dir="rtl" className="ev mx-auto max-w-[210mm] bg-white p-6 text-[12px] leading-6 text-neutral-900">
                <div className="no-print mb-4 flex items-center justify-between rounded-lg bg-neutral-100 p-3">
                    <span className="text-xs text-neutral-600">برای ذخیره‌ی PDF در پنجره‌ی چاپ، مقصد را «Save as PDF» بگذارید و گزینه‌ی Background graphics را روشن کنید.</span>
                    <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"><Printer className="size-4" />چاپ / ذخیره PDF</button>
                </div>

                <header className="avoid mb-4 border-b-4 border-neutral-900 pb-3">
                    <p className="text-[11px] text-neutral-500">StoreServer · گزارش مدرک استفاده از لایسنس</p>
                    <h1 className="text-xl font-extrabold">{r.meta.case.title}</h1>
                    <table className="mt-2">
                        <tbody>
                            <tr><th>شناسه گزارش</th><td className="mono">{r.meta.report_id}</td><th>شماره پرونده</th><td>{r.meta.case.reference ?? '—'}</td></tr>
                            <tr><th>زمان تولید</th><td>{formatDate(r.meta.generated_at)} <span className="mono">({r.meta.generated_at})</span></td><th>تولیدکننده</th><td>{r.meta.generated_by?.name ?? '—'}</td></tr>
                            <tr><th>SHA-256 فایل JSON</th><td colSpan={3} className="mono">{integrity.sha256}</td></tr>
                            <tr><th>صحت فایل</th><td colSpan={3}>{ok ? 'هش با مقدار ثبت‌شده در لاگ فقط‌افزودنی سرور مطابقت دارد' : 'هشدار: مغایرت هش - این نسخه معتبر نیست'}</td></tr>
                        </tbody>
                    </table>
                    {r.meta.case.notes && <p className="mt-2 whitespace-pre-line rounded border border-neutral-300 p-2">{r.meta.case.notes}</p>}
                </header>

                <Section title="۱. مشخصات مشتری و لایسنس">
                    <table>
                        <tbody>
                            <tr><th>نام مشتری</th><td>{r.customer?.name ?? '—'}</td><th>شرکت</th><td>{r.customer?.company ?? '—'}</td></tr>
                            <tr><th>تلفن</th><td className="mono">{r.customer?.phone ?? '—'}</td><th>کد ملی</th><td className="mono">{r.customer?.national_id ?? '—'}</td></tr>
                            <tr><th>نشانی</th><td colSpan={3}>{[r.customer?.province, r.customer?.city, r.customer?.address].filter(Boolean).join('، ') || '—'}</td></tr>
                            <tr><th>شناسه لایسنس</th><td className="mono">{r.license.uuid}</td><th>وضعیت / پلن</th><td>{r.license.status} / {r.license.plan?.name ?? '—'}</td></tr>
                            <tr><th>تاریخ صدور</th><td>{formatDate(r.license.created_at)}</td><th>تاریخ فعال‌سازی</th><td>{formatDate(r.license.activated_at)}</td></tr>
                            <tr><th>انقضا</th><td>{formatDate(r.license.expires_at)}</td><th>آخرین مشاهده</th><td>{formatDate(r.license.last_seen_at)}</td></tr>
                            {(r.license.suspend_reason || r.license.revoke_reason) && <tr><th>دلیل تعلیق/ابطال</th><td colSpan={3}>{r.license.revoke_reason ?? r.license.suspend_reason}</td></tr>}
                        </tbody>
                    </table>
                </Section>

                <Section title="۲. مشخصات دستگاه">
                    {r.device ? (
                        <table>
                            <tbody>
                                <tr><th>نام دستگاه</th><td>{r.device.hostname ?? '—'}</td><th>سیستم‌عامل</th><td>{[r.device.os, r.device.os_version].filter(Boolean).join(' ') || '—'}</td></tr>
                                <tr><th>CPU</th><td>{r.device.cpu ?? '—'}</td><th>RAM</th><td>{r.device.ram_mb ? `${formatNumber(Math.round(r.device.ram_mb / 1024))} GB` : '—'}</td></tr>
                                <tr><th>سریال مادربرد</th><td className="mono">{r.device.motherboard_serial ?? '—'}</td><th>سریال دیسک</th><td className="mono">{r.device.disk_serial ?? '—'}</td></tr>
                                <tr><th>MAC</th><td className="mono">{r.device.mac_address ?? '—'}</td><th>آخرین IP</th><td className="mono">{r.device.last_ip ?? '—'}</td></tr>
                                <tr><th>Fingerprint</th><td colSpan={3} className="mono">{r.device.fingerprint}</td></tr>
                                <tr><th>اولین اتصال</th><td>{formatDate(r.device.first_seen_at)}</td><th>آخرین ضربان</th><td>{formatDate(r.device.last_heartbeat_at)}</td></tr>
                            </tbody>
                        </table>
                    ) : <p>دستگاهی متصل نشده است.</p>}
                </Section>

                <Section title={`۳. نشانی‌های IP (${formatNumber(r.ip_addresses.length)} مورد - زمان‌ها UTC)`}>
                    <table>
                        <thead><tr><th>IP</th><th>عمومی</th><th>اولین مشاهده (UTC)</th><th>آخرین مشاهده (UTC)</th><th>تعداد</th><th>منبع</th></tr></thead>
                        <tbody>
                            {r.ip_addresses.map((i) => (
                                <tr key={i.ip}>
                                    <td className="mono">{i.ip}</td><td>{i.is_public ? 'بله' : 'خیر'}</td>
                                    <td className="mono">{i.first_seen}</td><td className="mono">{i.last_seen}</td>
                                    <td>{formatNumber(i.hits)}</td>
                                    <td>{Object.entries(i.by_source).map(([k, v]) => `${evidenceSource[k] ?? k}: ${v}`).join('، ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Section>

                <Section title={`۴. درخواست‌های فعال‌سازی (${r.activation_requests.length})`}>
                    <Rows empty={r.activation_requests.length === 0} head={['زمان (UTC)', 'متقاضی', 'تلفن', 'IP', 'وضعیت']}>
                        {r.activation_requests.map((a) => <tr key={a.uuid}><td className="mono">{a.created_at}</td><td>{a.customer_name ?? '—'}</td><td className="mono">{a.customer_phone}</td><td className="mono">{a.request_ip}</td><td>{a.status}</td></tr>)}
                    </Rows>
                </Section>

                <Section title={`۵. رویدادهای امنیتی (${formatNumber(r.security_events.total)}؛ بحرانی: ${formatNumber(r.security_events.critical)})`}>
                    <Rows empty={r.security_events.rows.length === 0} head={['زمان (UTC)', 'نوع', 'شدت', 'IP', 'شرح']}>
                        {r.security_events.rows.map((e, i) => <tr key={i}><td className="mono">{e.at}</td><td className="mono">{e.type}</td><td>{e.severity}</td><td className="mono">{e.ip}</td><td>{e.message}</td></tr>)}
                    </Rows>
                </Section>

                <Section title="۶. ضربان‌ها و درخواست‌های API">
                    <table>
                        <tbody>
                            <tr><th>تعداد کل ضربان</th><td>{formatNumber(r.heartbeats.total)}</td><th>بازه</th><td className="mono">{r.heartbeats.first_at} → {r.heartbeats.last_at}</td></tr>
                            <tr><th>نسخه‌های اپ دیده‌شده</th><td className="mono">{r.heartbeats.versions.join('، ') || '—'}</td><th>درخواست‌های API / ناموفق</th><td>{formatNumber(r.api_requests.total)} / {formatNumber(r.api_requests.failures_total)}</td></tr>
                        </tbody>
                    </table>
                </Section>

                <Section title="۷. یکپارچگی لاگ سمت اپ">
                    <table>
                        <tbody>
                            <tr><th>تعداد لاگ</th><td>{formatNumber(r.client_logs.total)}</td><th>وضعیت زنجیره‌ی هش</th><td>{r.client_logs.chain?.status ?? '—'}{r.client_logs.chain?.reason ? ` (${r.client_logs.chain.reason})` : ''}</td></tr>
                            <tr><th>بازه‌ی sequence</th><td className="mono">{r.client_logs.first_sequence ?? '—'} → {r.client_logs.last_sequence ?? '—'}</td><th>هش آخرین لاگ</th><td className="mono">{r.client_logs.last_hash ?? '—'}</td></tr>
                        </tbody>
                    </table>
                </Section>

                <Section title={`۸. اقدامات مدیران روی این لایسنس (${r.admin_actions.length})`}>
                    <Rows empty={r.admin_actions.length === 0} head={['زمان (UTC)', 'اقدام', 'مدیر', 'IP']}>
                        {r.admin_actions.map((a, i) => <tr key={i}><td className="mono">{a.at}</td><td>{a.description ?? a.action}</td><td>{a.user_name}</td><td className="mono">{a.ip}</td></tr>)}
                    </Rows>
                </Section>

                <Section title={`۹. خط زمانی (${formatNumber(Math.min(r.timeline.total, PRINT_TIMELINE_LIMIT))} از ${formatNumber(r.timeline.total)})`}>
                    <Rows empty={r.timeline.rows.length === 0} head={['زمان (UTC)', 'منبع', 'رویداد', 'IP', 'شرح']}>
                        {r.timeline.rows.slice(-PRINT_TIMELINE_LIMIT).map((t, i) => <tr key={i}><td className="mono">{t.at}</td><td>{evidenceSource[t.source] ?? t.source}</td><td className="mono">{t.type}</td><td className="mono">{t.ip}</td><td>{t.message}</td></tr>)}
                    </Rows>
                    {r.timeline.total > PRINT_TIMELINE_LIMIT && <p className="mt-1 text-[10px] text-neutral-500">فقط جدیدترین {PRINT_TIMELINE_LIMIT} رویداد چاپ شده است؛ فهرست کامل در فایل timeline.csv بسته‌ی ZIP هست.</p>}
                </Section>

                <Section title="توضیحات و محدودیت‌ها">
                    <ul className="list-disc space-y-1 pr-5">{r.meta.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                </Section>

                <div className="avoid mt-8 grid grid-cols-2 gap-8 text-center text-[11px]">
                    <div className="border-t border-neutral-400 pt-1">تهیه‌کننده: {r.meta.generated_by?.name ?? ''}</div>
                    <div className="border-t border-neutral-400 pt-1">مهر و امضا</div>
                </div>
            </div>
        </>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return <section><h2>{title}</h2>{children}</section>;
}

function Rows({ head, children, empty }: { head: string[]; children: ReactNode; empty: boolean }) {
    if (empty) return <p className="text-neutral-500">موردی ثبت نشده است.</p>;
    return <table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>;
}