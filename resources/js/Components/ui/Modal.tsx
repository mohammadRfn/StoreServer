import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { modalPanel, overlay } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    dismissible?: boolean;
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissible && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose, dismissible]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div key="modal-root" className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6" initial="hidden" animate="show" exit="exit">
                    <motion.div variants={overlay} className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        variants={modalPanel}
                        className={cn(
                            'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-neutral-900 ring-1 ring-white/10 shadow-2xl shadow-black/60 sm:rounded-2xl',
                            sizes[size],
                        )}
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-amber-300/40 to-transparent" />
                        {(title || dismissible) && (
                            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
                                <div>
                                    {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                                    {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
                                </div>
                                {dismissible && (
                                    <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white/10 hover:text-white" aria-label="بستن">
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="overflow-y-auto px-6 py-3">{children}</div>
                        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[.06] bg-white/[.02] px-6 py-4">{footer}</div>}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
