import { CalendarDays } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { jalaliDateTime, jalaliFull, jalaliNumeric, jalaliVerbose, type DateInput } from '@/lib/jalali';

/**
 * نمایش تاریخ شمسی (به وقت تهران) — هم‌قرارداد با JDate.vue در اپ گیم‌استور.
 *   <JDate value={row.created_at} />
 *   <JDate value={row.created_at} time />
 *   <JDate value={row.last_seen_at} relative />
 *   <JDate value={lic.expires_at} variant="chip" tone="warning" />
 */

type Format = 'long' | 'numeric';
type Variant = 'text' | 'soft' | 'chip';
type Tone = 'default' | 'gold' | 'success' | 'danger' | 'warning' | 'muted';

interface JDateProps {
    value: DateInput;
    format?: Format;
    time?: boolean;
    relative?: boolean;
    variant?: Variant;
    tone?: Tone;
    icon?: boolean;
    empty?: string;
    className?: string;
}

const toneText: Record<Tone, string> = {
    default: '',
    gold: 'text-amber-300',
    success: 'text-emerald-300',
    danger: 'text-rose-300',
    warning: 'text-amber-300',
    muted: 'text-neutral-500',
};

const toneBox: Record<Tone, string> = {
    default: 'bg-white/[.04] text-neutral-300 ring-white/10 hover:ring-white/20',
    gold: 'bg-amber-400/10 text-amber-300 ring-amber-400/25 hover:ring-amber-400/40',
    success: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25 hover:ring-emerald-400/40',
    danger: 'bg-rose-400/10 text-rose-300 ring-rose-400/25 hover:ring-rose-400/40',
    warning: 'bg-amber-400/10 text-amber-300 ring-amber-400/25 hover:ring-amber-400/40',
    muted: 'bg-white/[.03] text-neutral-500 ring-white/[.06]',
};

export function JDate({ value, format = 'long', time = false, relative = false, variant = 'text', tone = 'default', icon, empty = '—', className }: JDateProps) {
    const isEmpty = value === null || value === undefined || value === '';

    let text = empty;
    if (!isEmpty) {
        if (relative) text = timeAgo(String(value));
        else if (format === 'numeric') text = jalaliNumeric(value) ?? String(value);
        else text = (time ? jalaliDateTime(value) : jalaliFull(value)) ?? String(value);
    }

    const showIcon = icon ?? variant !== 'text';
    const title = isEmpty ? undefined : (jalaliVerbose(value) ?? undefined);

    return (
        <span
            title={title}
            className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap align-middle tabular-nums transition-colors duration-200',
                variant === 'text' && cn('border-b border-dotted border-transparent hover:border-white/25', toneText[tone]),
                variant === 'soft' && cn('rounded-lg px-2 py-0.5 text-[12px] ring-1 ring-inset', toneBox[tone]),
                variant === 'chip' && cn('rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset', toneBox[tone]),
                isEmpty && 'text-neutral-600',
                className,
            )}
        >
            {showIcon && <CalendarDays className="size-[1em] shrink-0 opacity-75" aria-hidden />}
            <span>{text}</span>
        </span>
    );
}

export default JDate;