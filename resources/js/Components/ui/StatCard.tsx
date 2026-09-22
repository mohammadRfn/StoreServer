import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '@/Hooks/useCountUp';
import { fadeUp } from '@/lib/motion';
import { cn, formatNumber } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: number;
    icon: LucideIcon;
    hint?: string;
    tone?: 'amber' | 'emerald' | 'sky' | 'rose' | 'violet' | 'neutral';
    trend?: number;
}

const tones = {
    amber: 'from-amber-400/20 to-amber-400/0 text-amber-300',
    emerald: 'from-emerald-400/20 to-emerald-400/0 text-emerald-300',
    sky: 'from-sky-400/20 to-sky-400/0 text-sky-300',
    rose: 'from-rose-400/20 to-rose-400/0 text-rose-300',
    violet: 'from-violet-400/20 to-violet-400/0 text-violet-300',
    neutral: 'from-neutral-400/20 to-neutral-400/0 text-neutral-300',
};

export function StatCard({ label, value, icon: Icon, hint, tone = 'amber', trend }: StatCardProps) {
    const { ref, value: v } = useCountUp(value);
    return (
        <motion.div
            variants={fadeUp}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="group relative overflow-hidden rounded-2xl bg-neutral-900/70 p-5 ring-1 ring-white/[.07]"
        >
            <div className={cn('pointer-events-none absolute -top-10 -left-10 size-40 rounded-full bg-gradient-to-br blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60', tones[tone])} />
            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-[13px] text-neutral-400">{label}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-white">
                        <span ref={ref}>{formatNumber(v)}</span>
                    </p>
                    {(hint || trend !== undefined) && (
                        <p className="mt-1.5 flex items-center gap-2 text-xs text-neutral-500">
                            {trend !== undefined && (
                                <span className={cn('rounded-md px-1.5 py-0.5 font-medium', trend >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300')}>
                                    {trend >= 0 ? '+' : ''}
                                    {formatNumber(trend)}٪
                                </span>
                            )}
                            {hint}
                        </p>
                    )}
                </div>
                <div className={cn('grid size-11 place-items-center rounded-xl bg-white/[.04] ring-1 ring-white/10', tones[tone].split(' ').pop())}>
                    <Icon className="size-5" />
                </div>
            </div>
        </motion.div>
    );
}
