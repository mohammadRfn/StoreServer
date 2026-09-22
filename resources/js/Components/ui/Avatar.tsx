import { cn, initials } from '@/lib/utils';

const palette = ['from-amber-400 to-orange-500', 'from-sky-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500', 'from-violet-400 to-purple-500'];

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
    const dims = size === 'sm' ? 'size-7 text-[11px]' : size === 'lg' ? 'size-12 text-base' : 'size-9 text-xs';
    return (
        <span className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-neutral-950 ring-2 ring-neutral-900', palette[idx], dims, className)}>
            {initials(name)}
        </span>
    );
}
