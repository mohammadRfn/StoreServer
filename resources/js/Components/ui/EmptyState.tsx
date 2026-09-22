import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-xl" />
                <div className="relative grid size-14 place-items-center rounded-2xl bg-white/[.04] text-neutral-400 ring-1 ring-white/10">{icon ?? <Inbox className="size-6" />}</div>
            </div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </motion.div>
    );
}
