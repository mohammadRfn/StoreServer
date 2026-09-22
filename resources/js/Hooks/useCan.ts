import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

/** Permission check against `auth.user.permissions` shared from HandleInertiaRequests. */
export function useCan() {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const can = (permission: string | string[]): boolean => {
        if (!user) return false;
        if (user.is_super_admin) return true;
        const list = Array.isArray(permission) ? permission : [permission];
        return list.some((p) => user.permissions?.includes(p));
    };

    return { can, user };
}
