import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/Components/ui/Toast';
import { EASE_OUT_EXPO } from '@/lib/motion';

export default function GuestLayout({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 py-12 text-neutral-100">
                <AnimatedBackdrop />
                <div className="relative z-10 w-full max-w-md">
                    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT_EXPO }} className="mb-8 flex flex-col items-center gap-3">
                        <motion.span
                            initial={{ scale: 0.6, rotate: -12 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                            className="relative grid size-14 place-items-center rounded-2xl bg-amber-400 text-neutral-950 shadow-[0_20px_60px_-15px_rgba(251,191,36,.6)]"
                        >
                            <ShieldCheck className="size-7" />
                            <span className="absolute -inset-px rounded-2xl ring-1 ring-white/30" />
                        </motion.span>
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-white">StoreServer</h1>
                            <p className="text-sm text-neutral-500">پنل مدیریت لایسنس GameShop</p>
                        </div>
                    </motion.div>
                    {children}
                </div>
            </div>
        </ToastProvider>
    );
}

function AnimatedBackdrop() {
    return (
        <div className="pointer-events-none absolute inset-0">
            <motion.div
                className="absolute -top-32 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-amber-400/[.08] blur-[130px]"
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-40 right-1/4 h-[400px] w-[500px] rounded-full bg-sky-500/[.06] blur-[130px]"
                animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        </div>
    );
}
