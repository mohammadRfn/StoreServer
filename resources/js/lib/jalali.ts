/**
 * resources/js/lib/jalali.ts
 * هستهٔ تاریخ شمسی پنل سرور (هم‌خانوادهٔ resources/js/Utils/jalali.js در اپ گیم‌استور).
 *
 *  - سرور همهٔ زمان‌ها را UTC ذخیره می‌کند؛ اینجا همه‌چیز صریحاً بر اساس Asia/Tehran محاسبه می‌شود.
 *  - رشتهٔ «فقط تاریخ» (YYYY-MM-DD) یک روز تقویمی است، نه یک لحظه؛ تبدیل تایم‌زون رویش اعمال نمی‌شود.
 */
import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';

export const APP_TIMEZONE = 'Asia/Tehran';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export const JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
] as const;

/** ترتیب getUTCDay(): 0 = یکشنبه */
const WEEKDAYS_SUN_FIRST = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'] as const;

export const WEEKDAY_INITIALS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

export type DateInput = string | number | Date | null | undefined;

export interface JalaliParts {
    jy: number;
    jm: number;
    jd: number;
    hour: number | null;
    minute: number | null;
    weekday: string;
    dateOnly: boolean;
}

export function toLatinDigits(s: string): string {
    return s
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export function faDigits(v: string | number | null | undefined): string {
    return String(v ?? '').replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

const tehranFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

interface WallParts {
    gy: number;
    gm: number;
    gd: number;
    hour: number;
    minute: number;
    second: number;
}

function tehranWall(instant: Date): WallParts {
    const map: Record<string, number> = {};
    for (const p of tehranFmt.formatToParts(instant)) {
        if (p.type !== 'literal') map[p.type] = Number(p.value);
    }
    return { gy: map.year, gm: map.month, gd: map.day, hour: map.hour % 24, minute: map.minute, second: map.second };
}

/** ساعت دیواری تهران → لحظهٔ UTC (آفست از Intl گرفته می‌شود تا DST قدیمی هم درست باشد) */
export function tehranWallToUtc(gy: number, gm: number, gd: number, hour = 0, minute = 0): Date {
    const asUtc = Date.UTC(gy, gm - 1, gd, hour, minute);
    let guess = asUtc - 3.5 * 3_600_000;
    for (let i = 0; i < 2; i++) {
        const w = tehranWall(new Date(guess));
        const shown = Date.UTC(w.gy, w.gm - 1, w.gd, w.hour, w.minute);
        guess += asUtc - shown;
    }
    return new Date(guess);
}

type Parsed =
    | { kind: 'date'; gy: number; gm: number; gd: number }
    | { kind: 'instant'; date: Date };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parse(input: DateInput): Parsed | null {
    if (input === null || input === undefined || input === '') return null;

    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : { kind: 'instant', date: input };

    if (typeof input === 'number') {
        const d = new Date(input > 1e11 ? input : input * 1000);
        return Number.isNaN(d.getTime()) ? null : { kind: 'instant', date: d };
    }

    const s = toLatinDigits(String(input)).trim();
    const only = s.match(DATE_ONLY);
    if (only) return { kind: 'date', gy: +only[1], gm: +only[2], gd: +only[3] };

    // بدون آفست (مثل 2026-09-24 10:00:00) یعنی UTC سرور
    const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
    const normalized = s.replace(' ', 'T');
    const d = new Date(hasZone ? normalized : `${normalized}Z`);
    return Number.isNaN(d.getTime()) ? null : { kind: 'instant', date: d };
}

export function toJalaliParts(input: DateInput): JalaliParts | null {
    const p = parse(input);
    if (!p) return null;

    try {
        if (p.kind === 'date') {
            const j = toJalaali(p.gy, p.gm, p.gd);
            const wd = new Date(Date.UTC(p.gy, p.gm - 1, p.gd)).getUTCDay();
            return { ...j, hour: null, minute: null, weekday: WEEKDAYS_SUN_FIRST[wd], dateOnly: true };
        }

        const w = tehranWall(p.date);
        const j = toJalaali(w.gy, w.gm, w.gd);
        const wd = new Date(Date.UTC(w.gy, w.gm - 1, w.gd)).getUTCDay();
        return { ...j, hour: w.hour, minute: w.minute, weekday: WEEKDAYS_SUN_FIRST[wd], dateOnly: false };
    } catch {
        return null;
    }
}

const timeText = (p: JalaliParts): string => faDigits(`${pad2(p.hour ?? 0)}:${pad2(p.minute ?? 0)}`);

/** «۲۱ مرداد» */
export function jalaliShort(input: DateInput): string | null {
    const p = toJalaliParts(input);
    return p ? `${faDigits(p.jd)} ${JALALI_MONTHS[p.jm - 1]}` : null;
}

/** «۲۱ مرداد ۱۴۰۴» */
export function jalaliFull(input: DateInput): string | null {
    const p = toJalaliParts(input);
    return p ? `${faDigits(p.jd)} ${JALALI_MONTHS[p.jm - 1]} ${faDigits(p.jy)}` : null;
}

/** «۱۴۰۴/۰۵/۲۱» */
export function jalaliNumeric(input: DateInput): string | null {
    const p = toJalaliParts(input);
    return p ? faDigits(`${p.jy}/${pad2(p.jm)}/${pad2(p.jd)}`) : null;
}

/** «۲۱:۳۰» (به وقت تهران) */
export function jalaliTime(input: DateInput): string | null {
    const p = toJalaliParts(input);
    return p && !p.dateOnly ? timeText(p) : null;
}

/** «۲۱ مرداد ۱۴۰۴، ۲۱:۳۰» — اگر ورودی فقط تاریخ باشد ساعت نمی‌آید */
export function jalaliDateTime(input: DateInput): string | null {
    const p = toJalaliParts(input);
    if (!p) return null;
    const base = `${faDigits(p.jd)} ${JALALI_MONTHS[p.jm - 1]} ${faDigits(p.jy)}`;
    return p.dateOnly ? base : `${base}، ${timeText(p)}`;
}

/** «شنبه ۲۱ مرداد ۱۴۰۴، ۲۱:۳۰» — مناسب tooltip */
export function jalaliVerbose(input: DateInput): string | null {
    const p = toJalaliParts(input);
    const t = jalaliDateTime(input);
    return p && t ? `${p.weekday} ${t}` : null;
}

export function todayJalali(): { jy: number; jm: number; jd: number } {
    const w = tehranWall(new Date());
    return toJalaali(w.gy, w.gm, w.gd);
}

/** ساعت فعلی تهران (۰ تا ۲۳) */
export function tehranHour(): number {
    return tehranWall(new Date()).hour;
}

/** شمسی → رشتهٔ میلادی «YYYY-MM-DD» */
export function jalaliToIsoDate(jy: number, jm: number, jd: number): string {
    const g = toGregorian(jy, jm, jd);
    return `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
}

export function jalaliMonthDays(jy: number, jm: number): number {
    return jalaaliMonthLength(jy, jm);
}

/** روزِ هفتهٔ اولِ ماه: ۰ = شنبه … ۶ = جمعه */
export function jalaliMonthOffset(jy: number, jm: number): number {
    const g = toGregorian(jy, jm, 1);
    const sunFirst = new Date(Date.UTC(g.gy, g.gm - 1, g.gd)).getUTCDay();
    return (sunFirst + 1) % 7;
}

/** روز شمسی در ساعت دیواری تهران → رشتهٔ ISO (UTC) برای ارسال به سرور */
export function jalaliWallToUtcIso(jy: number, jm: number, jd: number, hour: number, minute: number): string {
    const g = toGregorian(jy, jm, jd);
    return tehranWallToUtc(g.gy, g.gm, g.gd, hour, minute).toISOString();
}