import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PageProps } from '@/types';

type ToastKind = 'success' | 'error' | 'warning' | 'info';
interface ToastItem {
    id: number;
    kind: ToastKind;
    title: string;
    description?: string;
    duration: number;
}

interface ToastApi {
    toast: (kind: ToastKind, title: string, description?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}

const icons: Record<ToastKind, ReactNode> = {
    success: <CheckCircle2 className="size-5 text-emerald-400" />,
    error: <AlertCircle className="size-5 text-rose-400" />,
    warning: <TriangleAlert className="size-5 text-amber-400" />,
    info: <Info className="size-5 text-sky-400" />,
};

const bars: Record<ToastKind, string> = {
    success: 'bg-emerald-400',
    error: 'bg-rose-400',
    warning: 'bg-amber-400',
    info: 'bg-sky-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const counter = useRef(0);

    const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

    const toast = useCallback<ToastApi['toast']>((kind, title, description, duration = 4500) => {
        const id = ++counter.current;
        setItems((list) => [...list.slice(-4), { id, kind, title, description, duration }]);
    }, []);

    const api = useMemo(() => ({ toast }), [toast]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <FlashBridge />
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 sm:items-start sm:p-6">
                <AnimatePresence initial={false}>
                    {items.map((t) => (
                        <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
    useEffect(() => {
        const id = window.setTimeout(onDismiss, item.duration);
        return () => window.clearTimeout(id);
    }, [item.duration, onDismiss]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-900/95 p-4 pr-4 ring-1 ring-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
            <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{icons[item.kind]}</span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    {item.description && <p className="mt-0.5 text-xs leading-5 text-neutral-400">{item.description}</p>}
                </div>
                <button onClick={onDismiss} className="rounded-md p-1 text-neutral-500 transition hover:bg-white/10 hover:text-white">
                    <X className="size-3.5" />
                </button>
            </div>
            <motion.span
                className={`absolute bottom-0 right-0 h-0.5 ${bars[item.kind]}`}
                initial={{ width: '100%' }}
                animate={{ width: 0 }}
                transition={{ duration: item.duration / 1000, ease: 'linear' }}
            />
        </motion.div>
    );
}

/** Turns Laravel session flash (shared via HandleInertiaRequests) into toasts. */
function FlashBridge() {
    const { flash, errors } = usePage<PageProps>().props;
    const { toast } = useToast();
    const seen = useRef<unknown>(null);

    useEffect(() => {
        // each server response produces a new `flash` object → compare by identity
        if (!flash || flash === seen.current) return;
        seen.current = flash;
        if (flash.success) toast('success', flash.success);
        if (flash.error) toast('error', flash.error);
        if (flash.warning) toast('warning', flash.warning);
        if (flash.info) toast('info', flash.info);
    }, [flash, toast]);

    const seenErrors = useRef<unknown>(null);
    useEffect(() => {
        if (!errors || errors === seenErrors.current) return;
        seenErrors.current = errors;
        // validation errors that are not bound to a specific form field
        const general = errors.role || errors.customer || errors.plan || errors.roles;
        if (general) toast('error', general);
    }, [errors, toast]);

    return null;
}
