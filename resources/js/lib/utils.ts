import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

const faNumber = new Intl.NumberFormat('fa-IR');
const faCompact = new Intl.NumberFormat('fa-IR', { notation: 'compact' });

export function formatNumber(value: number | string | null | undefined, compact = false): string {
    if (value === null || value === undefined || value === '') return '—';
    const n = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(n)) return String(value);
    return (compact ? faCompact : faNumber).format(n);
}

export function formatPrice(irr: number | null | undefined): string {
    if (irr === null || irr === undefined) return '—';
    if (irr === 0) return 'رایگان';
    return `${formatNumber(Math.round(irr / 10))} تومان`;
}

export function formatDate(value: string | null | undefined, withTime = true): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(d);
}

export function timeAgo(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value).getTime();
    if (Number.isNaN(d)) return value;
    const diff = Date.now() - d;
    const rtf = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' });
    const s = Math.round(diff / 1000);
    if (Math.abs(s) < 60) return rtf.format(-s, 'second');
    const m = Math.round(s / 60);
    if (Math.abs(m) < 60) return rtf.format(-m, 'minute');
    const h = Math.round(m / 60);
    if (Math.abs(h) < 24) return rtf.format(-h, 'hour');
    const days = Math.round(h / 24);
    if (Math.abs(days) < 30) return rtf.format(-days, 'day');
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return rtf.format(-months, 'month');
    return rtf.format(-Math.round(months / 12), 'year');
}

export function daysUntil(value: string | null | undefined): number | null {
    if (!value) return null;
    const d = new Date(value).getTime();
    if (Number.isNaN(d)) return null;
    return Math.ceil((d - Date.now()) / 86_400_000);
}

export function formatBytes(bytes: number | null | undefined): string {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${formatNumber(Number(v.toFixed(1)))} ${units[i]}`;
}

export function shortId(value: string | null | undefined, len = 8): string {
    if (!value) return '—';
    return value.length > len ? `${value.slice(0, len)}…` : value;
}

export function initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('');
}

export function isOnline(lastHeartbeat: string | null | undefined, minutes = 90): boolean {
    if (!lastHeartbeat) return false;
    return Date.now() - new Date(lastHeartbeat).getTime() < minutes * 60_000;
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}
