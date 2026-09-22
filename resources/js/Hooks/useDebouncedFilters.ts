import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

type Filters = Record<string, string | number | undefined | null>;

/**
 * Keeps filter state in sync with the URL (Inertia partial visit, debounced).
 * Usage: const { values, set, reset } = useDebouncedFilters(route('admin.licenses.index'), filters)
 */
export function useDebouncedFilters<T extends Filters>(url: string, initial: T, delay = 350) {
    const [values, setValues] = useState<T>(initial);
    const first = useRef(true);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            const clean: Record<string, string | number> = {};
            Object.entries(values).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') clean[k] = v;
            });
            router.get(url, clean, { preserveState: true, preserveScroll: true, replace: true });
        }, delay);
        return () => window.clearTimeout(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values]);

    const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    }, []);

    const reset = useCallback(() => {
        const cleared = Object.fromEntries(Object.keys(values).map((k) => [k, ''])) as T;
        setValues(cleared);
    }, [values]);

    const isDirty = Object.values(values).some((v) => v !== undefined && v !== null && v !== '');

    return { values, set, reset, isDirty };
}
