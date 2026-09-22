import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { fadeUp } from '@/lib/motion';

interface Crumb {
    label: string;
    href?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs, badge }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: Crumb[]; badge?: ReactNode }) {
    return (
        <motion.div variants={fadeUp} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="mb-2 flex items-center gap-1 text-xs text-neutral-500">
                        {breadcrumbs.map((c, i) => (
                            <span key={i} className="flex items-center gap-1">
                                {c.href ? (
                                    <Link href={c.href} className="transition hover:text-amber-300">
                                        {c.label}
                                    </Link>
                                ) : (
                                    <span className="text-neutral-400">{c.label}</span>
                                )}
                                {i < breadcrumbs.length - 1 && <ChevronLeft className="size-3" />}
                            </span>
                        ))}
                    </nav>
                )}
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="truncate text-2xl font-bold tracking-tight text-white">{title}</h1>
                    {badge}
                </div>
                {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </motion.div>
    );
}
