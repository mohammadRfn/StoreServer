import type { ReactNode } from 'react';
import { toneClasses, toneDot, type StatusMeta, type Tone } from '@/lib/status';
import { cn } from '@/lib/utils';

interface BadgeProps {
    tone?: Tone;
    children: ReactNode;
    dot?: boolean;
    pulse?: boolean;
    className?: string;
    size?: 'sm' | 'md';
}

export function Badge({ tone = 'neutral', children, dot, pulse, className, size = 'md' }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
                size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
                toneClasses[tone],
                className,
            )}
        >
            {dot && (
                <span className="relative flex size-1.5">
                    {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', toneDot[tone])} />}
                    <span className={cn('relative inline-flex size-1.5 rounded-full', toneDot[tone])} />
                </span>
            )}
            {children}
        </span>
    );
}

export function StatusBadge<T extends string>({ status, map, size }: { status: T; map: Record<T, StatusMeta>; size?: 'sm' | 'md' }) {
    const meta = map[status] ?? { label: status, tone: 'neutral' as Tone };
    return (
        <Badge tone={meta.tone} dot pulse={meta.pulse} size={size}>
            {meta.label}
        </Badge>
    );
}
