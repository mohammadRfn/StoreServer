import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function KeyValue({ items, columns = 2, className }: { items: { label: string; value: ReactNode; mono?: boolean }[]; columns?: 1 | 2 | 3; className?: string }) {
    return (
        <dl className={cn('grid gap-x-6 gap-y-4', columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}>
            {items.map((it, i) => (
                <div key={i} className="min-w-0">
                    <dt className="text-xs text-neutral-500">{it.label}</dt>
                    <dd className={cn('mt-1 truncate text-sm text-neutral-100', it.mono && 'font-mono text-[12.5px]')} dir={it.mono ? 'ltr' : undefined}>
                        {it.value ?? '—'}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
