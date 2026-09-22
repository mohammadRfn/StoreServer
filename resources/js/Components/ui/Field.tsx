import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------ Field wrapper ---------------------------- */

interface FieldProps {
    label?: string;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
    htmlFor?: string;
}

export function Field({ label, hint, error, required, children, className, htmlFor }: FieldProps) {
    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label htmlFor={htmlFor} className="flex items-center gap-1 text-[13px] font-medium text-neutral-300">
                    {label}
                    {required && <span className="text-amber-400">*</span>}
                </label>
            )}
            {children}
            <AnimatePresence initial={false} mode="wait">
                {error ? (
                    <motion.p
                        key="error"
                        initial={{ opacity: 0, y: -4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs text-rose-400"
                    >
                        {error}
                    </motion.p>
                ) : hint ? (
                    <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-neutral-500">
                        {hint}
                    </motion.p>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

/* --------------------------------- Input --------------------------------- */

export const inputBase =
    'w-full rounded-xl border-0 bg-white/[.04] px-3.5 py-2.5 text-sm text-neutral-100 ring-1 ring-inset ring-white/10 transition-shadow duration-200 placeholder:text-neutral-500 hover:ring-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, startIcon, endIcon, ...rest }, ref) {
    return (
        <div className="relative">
            {startIcon && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-500">{startIcon}</span>}
            <input
                ref={ref}
                className={cn(inputBase, startIcon && 'pr-10', endIcon && 'pl-10', invalid && 'ring-rose-500/60 focus:ring-rose-500/60', className)}
                {...rest}
            />
            {endIcon && <span className="absolute inset-y-0 left-3 flex items-center text-neutral-500">{endIcon}</span>}
        </div>
    );
});

/* -------------------------------- Textarea ------------------------------- */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, ...rest }, ref) {
    return <textarea ref={ref} className={cn(inputBase, 'min-h-24 resize-y', invalid && 'ring-rose-500/60', className)} {...rest} />;
});

/* --------------------------------- Select -------------------------------- */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...rest }, ref) {
    return (
        <div className="relative">
            <select
                ref={ref}
                className={cn(inputBase, 'appearance-none pl-9 [&>option]:bg-neutral-900', invalid && 'ring-rose-500/60', className)}
                {...rest}
            >
                {children}
            </select>
            <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" viewBox="0 0 20 20" fill="none">
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
});

/* --------------------------------- Switch -------------------------------- */

interface SwitchProps {
    checked: boolean;
    onChange: (v: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

export function Switch({ checked, onChange, label, description, disabled, size = 'md' }: SwitchProps) {
    const dims = size === 'sm' ? { w: 'w-8', h: 'h-4.5', knob: 'size-3.5' } : { w: 'w-11', h: 'h-6', knob: 'size-5' };
    return (
        <label className={cn('flex cursor-pointer items-center justify-between gap-4', disabled && 'cursor-not-allowed opacity-50')}>
            {(label || description) && (
                <span className="flex flex-col">
                    {label && <span className="text-sm font-medium text-neutral-200">{label}</span>}
                    {description && <span className="text-xs text-neutral-500">{description}</span>}
                </span>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                    dims.w,
                    dims.h,
                    checked ? 'bg-amber-400' : 'bg-white/10 ring-1 ring-inset ring-white/10',
                )}
            >
                <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                    className={cn('block rounded-full shadow', dims.knob, checked ? 'bg-neutral-950' : 'bg-neutral-300')}
                    style={{ marginInlineStart: checked ? 'auto' : 0 }}
                />
            </button>
        </label>
    );
}

/* -------------------------------- Checkbox ------------------------------- */

interface CheckboxProps {
    checked: boolean;
    onChange: (v: boolean) => void;
    label?: ReactNode;
    description?: string;
    disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, description, disabled }: CheckboxProps) {
    return (
        <label className={cn('group flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-50')}>
            <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md ring-1 ring-inset transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                    checked ? 'bg-amber-400 ring-amber-400' : 'bg-white/[.04] ring-white/15 group-hover:ring-white/30',
                )}
            >
                <motion.svg viewBox="0 0 12 12" className="size-3 text-neutral-950" initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 30 }}>
                    <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
            </button>
            {(label || description) && (
                <span className="flex flex-col">
                    {label && <span className="text-sm text-neutral-200">{label}</span>}
                    {description && <span className="text-xs text-neutral-500">{description}</span>}
                </span>
            )}
        </label>
    );
}
