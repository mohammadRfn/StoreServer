import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
type Size = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: ReactNode;
    iconEnd?: ReactNode;
    children?: ReactNode;
    block?: boolean;
}

const variants: Record<Variant, string> = {
    primary:
        'bg-amber-400 text-neutral-950 shadow-[0_0_0_1px_rgba(251,191,36,.35),0_8px_24px_-8px_rgba(251,191,36,.55)] hover:bg-amber-300 focus-visible:ring-amber-300/60',
    secondary: 'bg-white/[.06] text-neutral-100 ring-1 ring-white/10 hover:bg-white/[.1] focus-visible:ring-white/30',
    outline: 'bg-transparent text-neutral-200 ring-1 ring-white/15 hover:bg-white/[.05] hover:ring-white/25',
    ghost: 'bg-transparent text-neutral-300 hover:bg-white/[.06] hover:text-white',
    danger: 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30 hover:bg-rose-500/25 focus-visible:ring-rose-400/50',
    success: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25',
};

const sizes: Record<Size, string> = {
    xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
    sm: 'h-8.5 px-3 text-[13px] gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = 'primary', size = 'md', loading, icon, iconEnd, className, children, disabled, block, ...rest },
    ref,
) {
    return (
        <motion.button
            ref={ref}
            whileTap={disabled || loading ? undefined : { scale: 0.97 }}
            whileHover={disabled || loading ? undefined : { y: -1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            disabled={disabled || loading}
            className={cn(
                'relative inline-flex select-none items-center justify-center font-medium whitespace-nowrap outline-none transition-[background-color,box-shadow,color] duration-200 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
                variants[variant],
                sizes[size],
                block && 'w-full',
                className,
            )}
            {...rest}
        >
            {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
            {children}
            {iconEnd}
        </motion.button>
    );
});
