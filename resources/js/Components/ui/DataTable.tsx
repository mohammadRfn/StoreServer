import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_OUT_EXPO } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';

export interface Column<T> {
    key: string;
    header: ReactNode;
    render: (row: T, index: number) => ReactNode;
    className?: string;
    headerClassName?: string;
    hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
}

interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string | number;
    onRowClick?: (row: T) => void;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    dense?: boolean;
}

const hide: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
    xl: 'hidden xl:table-cell',
};

export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyTitle = 'موردی یافت نشد', emptyDescription, emptyAction, dense }: DataTableProps<T>) {
    if (rows.length === 0) {
        return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
                <thead>
                    <tr>
                        {columns.map((c) => (
                            <th
                                key={c.key}
                                className={cn(
                                    'sticky top-0 z-10 border-b border-white/[.08] bg-neutral-900/80 px-4 py-3 text-right text-[12px] font-medium tracking-wide text-neutral-400 backdrop-blur first:rounded-tr-xl last:rounded-tl-xl',
                                    c.hideBelow && hide[c.hideBelow],
                                    c.headerClassName,
                                )}
                            >
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <motion.tr
                            key={rowKey(row)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: EASE_OUT_EXPO, delay: Math.min(i * 0.03, 0.4) }}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            className={cn('group transition-colors', onRowClick && 'cursor-pointer', 'hover:bg-white/[.03]')}
                        >
                            {columns.map((c) => (
                                <td
                                    key={c.key}
                                    className={cn(
                                        'border-b border-white/[.05] px-4 align-middle text-neutral-200 group-last:border-b-0',
                                        dense ? 'py-2.5' : 'py-3.5',
                                        c.hideBelow && hide[c.hideBelow],
                                        c.className,
                                    )}
                                >
                                    {c.render(row, i)}
                                </td>
                            ))}
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
