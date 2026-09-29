import { Link } from '@inertiajs/react';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/Components/ui/Badge';
import { Card, CardHeader } from '@/Components/ui/Card';
import { toneClasses, type Tone } from '@/lib/status';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import type { ClientLogSummary } from '@/types';

const levelTone: Record<string, Tone> = { emergency: 'danger', alert: 'danger', critical: 'danger', error: 'danger', warning: 'warning', notice: 'info', info: 'info', debug: 'neutral' };

// اپ فقط هنگام استفاده لاگ می‌فرستد؛ پس تا ۲۴ ساعت طبیعی، تا ۷۲ ساعت هشدار، بیشتر از آن قرمز
function freshness(iso: string | null): { tone: Tone; text: string } {
    if (!iso) return { tone: 'neutral', text: 'هنوز نرسیده' };
    const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
    return { tone: hours < 24 ? 'success' : hours < 72 ? 'warning' : 'danger', text: timeAgo(iso) };
}

function Stat({ label, value, tone, small }: { label: string; value: string; tone: Tone; small?: boolean }) {
    return (
        <div className={cn('rounded-xl p-3 ring-1', toneClasses[tone])}>
            <p className={cn('font-bold', small ? 'text-sm' : 'text-xl')}>{value}</p>
            <p className="mt-0.5 text-[10px] opacity-70">{label}</p>
        </div>
    );
}

export function ClientLogsCard({ summary, licenseId }: { summary?: ClientLogSummary | null; licenseId: number }) {
    if (!summary) return null;

    const fresh = freshness(summary.last_received_at);
    const href = (category: 'client' | 'client_error') => route('admin.logs.index', { category, license_id: licenseId });

    return (
        <Card>
            <CardHeader title="لاگ‌های اپ" description="خطاها و رویدادهای امنیتی ارسال‌شده از اپ این مشتری" action={<ScrollText className="size-5 text-neutral-500" />} />
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="آخرین لاگ" value={fresh.text} tone={fresh.tone} small />
                <Stat label="خطا (۲۴ ساعت)" value={formatNumber(summary.errors_24h)} tone={summary.errors_24h > 0 ? 'danger' : 'success'} />
                <Stat label="امنیتی (۲۴ ساعت)" value={formatNumber(summary.security_24h)} tone={summary.security_24h > 0 ? 'warning' : 'success'} />
            </div>

            {summary.app_queue && (
                <p className={cn('mb-4 text-xs', summary.app_queue.dead > 0 ? 'text-red-300' : 'text-neutral-500')}>
                    صف ارسال اپ: {formatNumber(summary.app_queue.pending)} در انتظار · {formatNumber(summary.app_queue.failed)} ناموفق · {formatNumber(summary.app_queue.dead)} متوقف‌شده (گزارش {timeAgo(summary.app_queue.reported_at)})
                </p>
            )}

            {summary.chain && summary.chain.status !== 'ok' && (
                <div className={cn('mb-4 rounded-xl p-3 text-xs ring-1', toneClasses[summary.chain.status === 'broken' ? 'danger' : 'warning'])}>
                    {summary.chain.status === 'broken'
                        ? `زنجیره‌ی هش لاگ شکسته شده (${summary.chain.reason === 'fork' ? 'دو رکورد با sequence یکسان؛ بازسازی یا restore دیتابیس اپ' : 'ناسازگاری پیوند هش'} — sequence ${summary.chain.broken_sequence}). ممکن است دیتابیس اپ دستکاری شده باشد.`
                        : `رکورد(های) گمشده در زنجیره از sequence ${summary.chain.missing_from} به بعد؛ اپ هنوز آن‌ها را ارسال نکرده است.`}
                </div>
            )}

            {summary.recent.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-neutral-500">
                    {summary.last_received_at ? 'خطا یا رویداد امنیتی‌ای ثبت نشده است.' : 'این اپ هنوز هیچ لاگی به سرور ارسال نکرده است.'}
                </p>
            ) : (
                <ul className="divide-y divide-white/[.05]">
                    {summary.recent.map((r) => (
                        <li key={r.id} className="flex items-start gap-2 py-2">
                            <Badge size="sm" tone={levelTone[r.level] ?? 'info'}>{r.level}</Badge>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-neutral-200" dir="auto">{r.description ?? r.action ?? '—'}</p>
                                <p className="text-[10px] text-neutral-500">{r.channel} · {timeAgo(r.occurred_at ?? r.created_at)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-4 flex items-center gap-2 border-t border-white/[.06] pt-4 text-xs">
                <Link href={href('client_error')} className="text-amber-300 hover:underline">همه‌ی خطاها</Link>
                <span className="text-neutral-600">·</span>
                <Link href={href('client')} className="text-amber-300 hover:underline">همه‌ی لاگ‌ها</Link>
            </div>
        </Card>
    );
}