import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLMotionProps<'div'> {
    children: ReactNode;
    padded?: boolean;
    animate?: boolean;
    glow?: boolean;
}

export function Card({ children, className, padded = true, animate = true, glow, ...rest }: CardProps) {
    return (
        <motion.div
            variants={animate ? fadeUp : undefined}
            className={cn(
                'relative overflow-hidden rounded-2xl bg-neutral-900/70 ring-1 ring-white/[.07] backdrop-blur-sm',
                'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-l before:from-transparent before:via-white/15 before:to-transparent',
                glow && 'shadow-[0_0_80px_-30px_rgba(251,191,36,.35)]',
                padded && 'p-5 sm:p-6',
                className,
            )}
            {...rest}
        >
            {children}
        </motion.div>
    );
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
    return (
        <div className={cn('mb-5 flex flex-wrap items-start justify-between gap-3', className)}>
            <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
            </div>
            {action}
        </div>
    );
}
