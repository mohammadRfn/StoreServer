import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn, copyToClipboard } from '@/lib/utils';

export function CopyButton({ value, className, label }: { value: string; className?: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={async (e) => {
                e.stopPropagation();
                if (await copyToClipboard(value)) {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                }
            }}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-neutral-400 transition hover:bg-white/10 hover:text-white', className)}
            aria-label="کپی"
        >
            <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                    <motion.span key="ok" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="text-emerald-400">
                        <Check className="size-3.5" />
                    </motion.span>
                ) : (
                    <motion.span key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                        <Copy className="size-3.5" />
                    </motion.span>
                )}
            </AnimatePresence>
            {label}
        </button>
    );
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
    return <span className={cn('font-mono text-[12.5px] tracking-tight text-neutral-300', className)} dir="ltr">{children}</span>;
}
