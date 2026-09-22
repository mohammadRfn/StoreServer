import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Paginated } from '@/types';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function Pagination<T>({ paginator, className }: { paginator: Paginated<T>; className?: string }) {
    if (paginator.last_page <= 1) {
        return (
            <div className={cn('flex items-center justify-between px-1 pt-4 text-xs text-neutral-500', className)}>
                <span>
                    {formatNumber(paginator.total)} مورد
                </span>
            </div>
        );
    }

    const pages = paginator.links.slice(1, -1); // remove prev/next
    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-3 px-1 pt-4', className)}>
            <p className="text-xs text-neutral-500">
                نمایش {formatNumber(paginator.from)} تا {formatNumber(paginator.to)} از {formatNumber(paginator.total)} مورد
            </p>
            <nav className="flex items-center gap-1">
                <PageLink href={paginator.prev_page_url} aria-label="قبلی">
                    <ChevronRight className="size-4" />
                </PageLink>
                {pages.map((l, i) => (
                    <PageLink key={i} href={l.url} active={l.active}>
                        {l.label === '...' ? '…' : formatNumber(l.label)}
                    </PageLink>
                ))}
                <PageLink href={paginator.next_page_url} aria-label="بعدی">
                    <ChevronLeft className="size-4" />
                </PageLink>
            </nav>
        </div>
    );
}

function PageLink({ href, active, children, ...rest }: { href: string | null; active?: boolean; children: React.ReactNode; 'aria-label'?: string }) {
    const base = 'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-medium transition-all duration-200';
    if (!href) return <span className={cn(base, 'cursor-not-allowed text-neutral-600')}>{children}</span>;
    return (
        <Link
            href={href}
            preserveScroll
            preserveState
            className={cn(base, active ? 'bg-amber-400 text-neutral-950 shadow-lg shadow-amber-400/20' : 'text-neutral-300 hover:bg-white/[.08] hover:text-white')}
            {...rest}
        >
            {children}
        </Link>
    );
}
