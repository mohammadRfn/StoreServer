import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { inputBase } from '@/Components/ui/Field';
import {
    JALALI_MONTHS,
    WEEKDAY_INITIALS,
    faDigits,
    jalaliDateTime,
    jalaliMonthDays,
    jalaliMonthOffset,
    jalaliNumeric,
    jalaliToIsoDate,
    jalaliWallToUtcIso,
    toJalaliParts,
    todayJalali,
} from '@/lib/jalali';
import { cn } from '@/lib/utils';

/**
 * انتخابگر تاریخ شمسی.
 * حالت تاریخ: value/onChange = 'YYYY-MM-DD' میلادی (پاک‌کردن → '').
 * حالت withTime: value/onChange = ISO به‌صورت UTC؛ ساعتِ نمایشی به وقت تهران است.
 */

interface JalaliDatePickerProps {
    value: string | null | undefined;
    onChange: (value: string) => void;
    withTime?: boolean;
    placeholder?: string;
    disablePast?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    size?: 'md' | 'sm';
    className?: string;
    id?: string;
}

const POP_WIDTH = 304;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const cmp = (a: [number, number, number], b: [number, number, number]): number => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

export function JalaliDatePicker({
    value,
    onChange,
    withTime = false,
    placeholder = 'انتخاب تاریخ',
    disablePast = false,
    clearable = true,
    disabled = false,
    invalid = false,
    size = 'md',
    className,
    id,
}: JalaliDatePickerProps) {
    const today = useMemo(() => todayJalali(), []);
    const selected = useMemo(() => toJalaliParts(value), [value]);

    const [open, setOpen] = useState(false);
    const [yearMode, setYearMode] = useState(false);
    const [viewY, setViewY] = useState(selected?.jy ?? today.jy);
    const [viewM, setViewM] = useState(selected?.jm ?? today.jm);
    const [hour, setHour] = useState(selected?.hour ?? 12);
    const [minute, setMinute] = useState(selected?.minute ?? 0);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 8 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const yearsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selected) return;
        setViewY(selected.jy);
        setViewM(selected.jm);
        if (selected.hour !== null) setHour(selected.hour);
        if (selected.minute !== null) setMinute(selected.minute);
    }, [selected]);

    const place = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const popH = popRef.current?.offsetHeight ?? (withTime ? 430 : 380);
        const gap = 6;
        const margin = 8;
        const right = Math.max(margin, Math.min(window.innerWidth - r.right, window.innerWidth - POP_WIDTH - margin));
        const below = window.innerHeight - r.bottom - gap - margin;
        const above = r.top - gap - margin;
        const openUp = below < popH && above > below;
        const raw = openUp ? r.top - popH - gap : r.bottom + gap;
        setPos({ top: Math.max(margin, Math.min(raw, window.innerHeight - popH - margin)), right });
    }, [withTime]);

    useLayoutEffect(() => {
        if (open) place();
    }, [open, yearMode, viewM, viewY, place]);

    useEffect(() => {
        if (!open) return;
        const onScroll = (e: Event) => {
            if (e.target instanceof Node && popRef.current?.contains(e.target)) return;
            place();
        };
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', place);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', place);
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, place]);

    useEffect(() => {
        if (!yearMode) return;
        const box = yearsRef.current;
        const el = box?.querySelector<HTMLElement>('[data-active="true"]');
        if (box && el) box.scrollTop = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    }, [yearMode]);

    const display = useMemo(() => {
        if (!value) return '';
        return (withTime ? jalaliDateTime(value) : jalaliNumeric(value)) ?? '';
    }, [value, withTime]);

    const years = useMemo(() => {
        const from = Math.min(today.jy - 40, selected?.jy ?? today.jy);
        const to = Math.max(today.jy + 10, selected?.jy ?? today.jy);
        return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    }, [today.jy, selected?.jy]);

    const daysCount = jalaliMonthDays(viewY, viewM);
    const offset = jalaliMonthOffset(viewY, viewM);

    const emit = (jy: number, jm: number, jd: number, h: number, mi: number) => {
        onChange(withTime ? jalaliWallToUtcIso(jy, jm, jd, h, mi) : jalaliToIsoDate(jy, jm, jd));
    };

    const pickDay = (day: number) => {
        emit(viewY, viewM, day, hour, minute);
        if (!withTime) setOpen(false);
    };

    const pickToday = () => {
        setViewY(today.jy);
        setViewM(today.jm);
        setYearMode(false);
        emit(today.jy, today.jm, today.jd, hour, minute);
        if (!withTime) setOpen(false);
    };

    const changeTime = (h: number, mi: number) => {
        setHour(h);
        setMinute(mi);
        if (selected) emit(selected.jy, selected.jm, selected.jd, h, mi);
    };

    const clear = () => {
        onChange('');
        setOpen(false);
    };

    const step = (delta: number) => {
        let m = viewM + delta;
        let y = viewY;
        if (m < 1) { m = 12; y--; }
        if (m > 12) { m = 1; y++; }
        setViewM(m);
        setViewY(y);
    };

    const isDisabledDay = (day: number) => disablePast && cmp([viewY, viewM, day], [today.jy, today.jm, today.jd]) < 0;
    const isSelected = (day: number) => !!selected && selected.jy === viewY && selected.jm === viewM && selected.jd === day;
    const isToday = (day: number) => today.jy === viewY && today.jm === viewM && today.jd === day;

    const canClear = clearable && !!display && !disabled;

    return (
        <div className={cn('relative w-full', className)}>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => { setOpen((v) => !v); setYearMode(false); }}
                onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); } }}
                className={cn(
                    inputBase,
                    'group flex items-center gap-2 text-start',
                    size === 'sm' ? 'py-1.5 text-xs' : 'py-2.5',
                    open && 'ring-2 ring-amber-400/60',
                    invalid && 'ring-rose-500/60',
                )}
            >
                <CalendarDays className={cn('size-4 shrink-0 transition-colors', open ? 'text-amber-300' : 'text-neutral-500 group-hover:text-amber-300')} aria-hidden />
                <span className={cn('min-w-0 flex-1 truncate tabular-nums', display ? 'font-semibold text-neutral-100' : 'text-neutral-500')}>{display || placeholder}</span>
                {canClear ? (
                    <span
                        role="button"
                        tabIndex={-1}
                        title="پاک کردن"
                        onClick={(e) => { e.stopPropagation(); clear(); }}
                        className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-neutral-400 transition hover:rotate-90 hover:bg-rose-400/20 hover:text-rose-300"
                    >
                        <X className="size-3" />
                    </span>
                ) : (
                    <ChevronDown className={cn('size-4 shrink-0 text-neutral-500 transition-transform duration-300', open && 'rotate-180 text-amber-300')} aria-hidden />
                )}
            </button>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                ref={popRef}
                                dir="rtl"
                                role="dialog"
                                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                style={{ position: 'fixed', top: pos.top, right: pos.right, width: POP_WIDTH, zIndex: 1000 }}
                                className="rounded-2xl border border-white/10 bg-neutral-900/95 p-3 text-neutral-100 shadow-2xl shadow-black/60 backdrop-blur-xl"
                            >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <NavButton title="ماه بعد" onClick={() => step(1)}><ChevronRight className="size-4" /></NavButton>
                                    <button
                                        type="button"
                                        onClick={() => setYearMode((v) => !v)}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-bold transition hover:bg-amber-400/10"
                                    >
                                        <span>{JALALI_MONTHS[viewM - 1]}</span>
                                        <span className="tabular-nums text-amber-300">{faDigits(viewY)}</span>
                                        <ChevronDown className={cn('size-3.5 opacity-60 transition-transform', yearMode && 'rotate-180')} />
                                    </button>
                                    <NavButton title="ماه قبل" onClick={() => step(-1)}><ChevronLeft className="size-4" /></NavButton>
                                </div>

                                {yearMode ? (
                                    <div className="space-y-2">
                                        <div ref={yearsRef} className="relative grid max-h-32 grid-cols-4 gap-1 overflow-y-auto overscroll-contain p-0.5">
                                            {years.map((y) => (
                                                <button
                                                    key={y}
                                                    type="button"
                                                    data-active={y === viewY}
                                                    onClick={() => setViewY(y)}
                                                    className={cn(
                                                        'rounded-lg py-1.5 text-xs tabular-nums ring-1 ring-inset transition',
                                                        y === viewY ? 'bg-amber-400 font-extrabold text-neutral-950 ring-transparent' : 'bg-white/[.04] text-neutral-300 ring-white/[.06] hover:ring-white/20',
                                                    )}
                                                >
                                                    {faDigits(y)}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            {JALALI_MONTHS.map((m, i) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => { setViewM(i + 1); setYearMode(false); }}
                                                    className={cn(
                                                        'rounded-lg py-1.5 text-xs ring-1 ring-inset transition',
                                                        i + 1 === viewM ? 'bg-amber-400/15 font-bold text-amber-300 ring-amber-400/40' : 'bg-white/[.04] text-neutral-300 ring-white/[.06] hover:bg-amber-400/10 hover:text-amber-300',
                                                    )}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div key={`${viewY}-${viewM}`} className="grid grid-cols-7 gap-[3px] text-center">
                                        {WEEKDAY_INITIALS.map((d, i) => (
                                            <span key={d} className={cn('py-1 text-[11px] font-bold', i === 6 ? 'text-rose-400/80' : 'text-neutral-500')}>{d}</span>
                                        ))}
                                        {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} />)}
                                        {Array.from({ length: daysCount }, (_, i) => i + 1).map((day) => {
                                            const active = isSelected(day);
                                            const friday = (offset + day - 1) % 7 === 6;
                                            const off = isDisabledDay(day);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    disabled={off}
                                                    onClick={() => pickDay(day)}
                                                    className={cn(
                                                        'relative grid aspect-square place-items-center rounded-lg text-xs tabular-nums transition duration-200',
                                                        off && 'cursor-not-allowed opacity-30',
                                                        !off && !active && 'hover:scale-110 hover:bg-white/10',
                                                        active
                                                            ? 'scale-105 bg-amber-400 font-extrabold text-neutral-950 shadow-lg shadow-amber-400/30'
                                                            : friday ? 'text-rose-300/80' : 'text-neutral-300',
                                                        isToday(day) && !active && 'font-bold text-amber-300 ring-1 ring-inset ring-amber-400/40',
                                                    )}
                                                >
                                                    {faDigits(day)}
                                                    {isToday(day) && <i className={cn('absolute bottom-1 size-1 rounded-full', active ? 'bg-neutral-950' : 'bg-amber-400')} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {withTime && !yearMode && (
                                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[.06] pt-3">
                                        <span className="text-[11px] text-neutral-500">ساعت (وقت تهران)</span>
                                        <div dir="ltr" className="flex items-center gap-1.5">
                                            <TimeSelect value={hour} options={HOURS} label="ساعت" onChange={(h) => changeTime(h, minute)} />
                                            <span className="font-bold text-neutral-500">:</span>
                                            <TimeSelect value={minute} options={MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort((a, b) => a - b)} label="دقیقه" onChange={(m) => changeTime(hour, m)} />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[.06] pt-3">
                                    <PopAction gold onClick={pickToday}>امروز</PopAction>
                                    <span className="min-w-0 flex-1 truncate text-center text-[11px] tabular-nums text-neutral-500">{display || 'تاریخی انتخاب نشده'}</span>
                                    {withTime ? <PopAction onClick={() => setOpen(false)}>تأیید</PopAction> : <PopAction onClick={clear}>پاک کردن</PopAction>}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}
        </div>
    );
}

function NavButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.04] text-neutral-400 ring-1 ring-inset ring-white/10 transition hover:scale-105 hover:bg-amber-400/10 hover:text-amber-300"
        >
            {children}
        </button>
    );
}

function PopAction({ children, onClick, gold = false }: { children: React.ReactNode; onClick: () => void; gold?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition hover:-translate-y-px',
                gold ? 'bg-amber-400/10 text-amber-300 ring-amber-400/30 hover:shadow-lg hover:shadow-amber-400/20' : 'bg-white/[.04] text-neutral-300 ring-white/10 hover:text-white',
            )}
        >
            {children}
        </button>
    );
}

function TimeSelect({ value, options, label, onChange }: { value: number; options: number[]; label: string; onChange: (v: number) => void }) {
    return (
        <select
            aria-label={label}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="cursor-pointer appearance-none rounded-lg border-0 bg-white/[.06] px-2.5 py-1.5 text-center text-sm tabular-nums text-neutral-100 ring-1 ring-inset ring-white/10 hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/60 [&>option]:bg-neutral-900"
        >
            {options.map((o) => (
                <option key={o} value={o}>{faDigits(String(o).padStart(2, '0'))}</option>
            ))}
        </select>
    );
}

export default JalaliDatePicker;