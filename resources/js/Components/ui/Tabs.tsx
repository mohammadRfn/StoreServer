import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
    value: T;
    label: ReactNode;
    count?: number;
}

export function Tabs<T extends string>({ tabs, value, onChange, id = 'tabs', className }: { tabs: TabItem<T>[]; value: T; onChange: (v: T) => void; id?: string; className?: string }) {
    return (
        <div className={cn('flex gap-1 overflow-x-auto rounded-xl bg-white/[.03] p-1 ring-1 ring-white/[.06]', className)}>
            {tabs.map((t) => {
                const active = t.value === value;
                return (
                    <button
                        key={t.value}
                        onClick={() => onChange(t.value)}
                        className={cn('relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors', active ? 'text-neutral-950' : 'text-neutral-400 hover:text-white')}
                    >
                        {active && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-lg bg-amber-400 shadow-md shadow-amber-400/20" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                        <span className="relative">{t.label}</span>
                        {t.count !== undefined && <span className={cn('relative rounded-md px-1.5 text-[11px] tabular-nums', active ? 'bg-neutral-950/15' : 'bg-white/[.06]')}>{t.count}</span>}
                    </button>
                );
            })}
        </div>
    );
}
