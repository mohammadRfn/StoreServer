import { Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    Bell,
    Boxes,
    ChevronDown,
    CircleUser,
    Cpu,
    FileText,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    MonitorSmartphone,
    Package,
    ScrollText,
    Settings,
    ShieldCheck,
    ShieldHalf,
    Ticket,
    Users,
    UsersRound,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ToastProvider } from '@/Components/ui/Toast';
import { Avatar } from '@/Components/ui/Avatar';
import { useCan } from '@/Hooks/useCan';
import { EASE_OUT_EXPO, pageTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

/* ----------------------------- Navigation model --------------------------- */

interface NavItem {
    label: string;
    icon: typeof LayoutDashboard;
    route: string;
    permission?: string | string[];
    /** route-name prefixes that count as "active" */
    match?: string[];
}
interface NavGroup {
    title?: string;
    items: NavItem[];
}

const NAV: NavGroup[] = [
    { items: [{ label: 'داشبورد', icon: LayoutDashboard, route: 'admin.dashboard' }] },
    {
        title: 'لایسنسینگ',
        items: [
            { label: 'لایسنس‌ها', icon: KeyRound, route: 'admin.licenses.index', permission: 'license.view', match: ['admin.licenses.'] },
            { label: 'درخواست‌های فعال‌سازی', icon: Ticket, route: 'admin.activation-requests.index', permission: 'license.view' },
            { label: 'کدهای یک‌بارمصرف', icon: ShieldHalf, route: 'admin.license-codes.index', permission: 'license.view' },
            { label: 'دستگاه‌ها', icon: MonitorSmartphone, route: 'admin.devices.index', permission: 'device.view', match: ['admin.devices.'] },
        ],
    },
    {
        title: 'کاتالوگ',
        items: [
            { label: 'مشتریان', icon: UsersRound, route: 'admin.customers.index', permission: 'customer.view', match: ['admin.customers.'] },
            { label: 'پلن‌ها', icon: Boxes, route: 'admin.plans.index', permission: 'plan.view', match: ['admin.plans.'] },
            { label: 'ماژول‌ها', icon: Cpu, route: 'admin.modules.index', permission: 'plan.manage' },
            { label: 'پچ‌ها', icon: Package, route: 'admin.patches.index', permission: 'patch.view', match: ['admin.patches.'] },
        ],
    },
    {
        title: 'سیستم',
        items: [
            { label: 'لاگ‌ها', icon: ScrollText, route: 'admin.logs.index', permission: 'log.view' },
            { label: 'ادمین‌ها', icon: Users, route: 'admin.admins.index', permission: 'admin.manage' },
            { label: 'نقش‌ها', icon: ShieldCheck, route: 'admin.roles.index', permission: 'admin.manage' },
            { label: 'تنظیمات', icon: Settings, route: 'admin.settings.index', permission: 'setting.manage' },
        ],
    },
];

/* --------------------------------- Layout -------------------------------- */

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <ToastProvider>
            <Shell>{children}</Shell>
        </ToastProvider>
    );
}

function Shell({ children }: { children: ReactNode }) {
    const page = usePage<PageProps>();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('ss:sidebar') === '1');

    useEffect(() => {
        window.localStorage.setItem('ss:sidebar', collapsed ? '1' : '0');
    }, [collapsed]);

    useEffect(() => {
        const off = router.on('navigate', () => setMobileOpen(false));
        return off;
    }, []);

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-amber-400/30">
            <Backdrop />

            {/* Desktop sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 76 : 264 }}
                transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                className="fixed inset-y-0 right-0 z-40 hidden flex-col border-l border-white/[.06] bg-neutral-950/70 backdrop-blur-xl lg:flex"
            >
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
            </motion.aside>

            {/* Mobile sidebar */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
                        <motion.aside
                            key="sb"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                            className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-white/[.06] bg-neutral-950 lg:hidden"
                        >
                            <Sidebar collapsed={false} onClose={() => setMobileOpen(false)} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main */}
            <div className="relative flex min-h-screen flex-col transition-[padding] duration-500 ease-[cubic-bezier(.16,1,.3,1)] lg:pr-[var(--sb)]" style={{ ['--sb' as string]: `${collapsed ? 76 : 264}px` }}>
                <Topbar onMenu={() => setMobileOpen(true)} />
                <main className="relative flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={page.url.split('?')[0]} variants={pageTransition} initial="hidden" animate="show" exit="exit" className="mx-auto w-full max-w-7xl">
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

/* -------------------------------- Backdrop ------------------------------- */

function Backdrop() {
    return (
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
            <div className="absolute -top-40 right-1/3 h-[420px] w-[620px] rounded-full bg-amber-400/[.05] blur-[120px]" />
            <div className="absolute bottom-0 left-0 h-[320px] w-[420px] rounded-full bg-sky-500/[.04] blur-[120px]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        </div>
    );
}

/* -------------------------------- Sidebar -------------------------------- */

function Sidebar({ collapsed, onToggle, onClose }: { collapsed: boolean; onToggle?: () => void; onClose?: () => void }) {
    const { can } = useCan();
    const current = typeof route === 'function' ? (route().current() as string | undefined) : undefined;

    const isActive = (item: NavItem) => {
        if (!current) return false;
        if (current === item.route) return true;
        return item.match?.some((m) => current.startsWith(m)) ?? false;
    };

    const groups = useMemo(() => NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(i.permission)) })).filter((g) => g.items.length > 0), [can]);

    return (
        <>
            <div className={cn('flex h-16 items-center border-b border-white/[.06] px-4', collapsed ? 'justify-center' : 'justify-between')}>
                <Link href={route('admin.dashboard')} className="flex items-center gap-3">
                    <span className="relative grid size-9 place-items-center rounded-xl bg-amber-400 text-neutral-950 shadow-lg shadow-amber-400/25">
                        <ShieldCheck className="size-5" />
                        <span className="absolute -inset-px rounded-xl ring-1 ring-white/30" />
                    </span>
                    <AnimatePresence initial={false}>
                        {!collapsed && (
                            <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="whitespace-nowrap">
                                <span className="block text-sm font-bold leading-tight text-white">StoreServer</span>
                                <span className="block text-[11px] text-neutral-500">سرور لایسنس GameShop</span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>
                {onClose && (
                    <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white">
                        <X className="size-4" />
                    </button>
                )}
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
                {groups.map((g, gi) => (
                    <div key={gi}>
                        {g.title && (
                            <AnimatePresence initial={false}>
                                {!collapsed && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-1.5 px-3 text-[11px] font-medium tracking-wider text-neutral-500">
                                        {g.title}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        )}
                        <ul className="space-y-0.5">
                            {g.items.map((item) => {
                                const active = isActive(item);
                                return (
                                    <li key={item.route}>
                                        <Link
                                            href={route(item.route)}
                                            title={collapsed ? item.label : undefined}
                                            className={cn(
                                                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200',
                                                active ? 'text-amber-300' : 'text-neutral-400 hover:text-white',
                                                collapsed && 'justify-center px-0',
                                            )}
                                        >
                                            {active && (
                                                <motion.span
                                                    layoutId="nav-active"
                                                    className="absolute inset-0 rounded-xl bg-amber-400/[.09] ring-1 ring-amber-400/20"
                                                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                                                />
                                            )}
                                            {!active && <span className="absolute inset-0 rounded-xl bg-white/0 transition-colors duration-200 group-hover:bg-white/[.05]" />}
                                            <item.icon className={cn('relative size-[18px] shrink-0 transition-transform duration-300', !active && 'group-hover:scale-110')} />
                                            {!collapsed && <span className="relative truncate">{item.label}</span>}
                                            {active && !collapsed && <span className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-l bg-amber-400" />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {onToggle && (
                <div className="border-t border-white/[.06] p-3">
                    <button onClick={onToggle} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-neutral-500 transition hover:bg-white/[.05] hover:text-white', collapsed && 'justify-center px-0')}>
                        <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}>
                            <ChevronDown className="size-4 rotate-90" />
                        </motion.span>
                        {!collapsed && <span>جمع‌کردن منو</span>}
                    </button>
                </div>
            )}
        </>
    );
}

/* --------------------------------- Topbar -------------------------------- */

function Topbar({ onMenu }: { onMenu: () => void }) {
    const { auth, app } = usePage<PageProps>().props;
    const user = auth?.user;
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [open]);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[.06] bg-neutral-950/60 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <button onClick={onMenu} className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="منو">
                <Menu className="size-5" />
            </button>

            <div className="hidden items-center gap-2 text-xs text-neutral-500 sm:flex">
                <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                سرویس آنلاین
                {app?.env && app.env !== 'production' && <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 ring-1 ring-amber-400/20">{app.env}</span>}
            </div>

            <div className="flex-1" />

            <Link href={route('admin.activation-requests.index')} className="relative rounded-lg p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white" title="درخواست‌های فعال‌سازی">
                <Bell className="size-5" />
            </Link>
            <Link href={route('admin.logs.index', { category: 'security' })} className="rounded-lg p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white" title="رویدادهای امنیتی">
                <Activity className="size-5" />
            </Link>

            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen((v) => !v);
                    }}
                    className="flex items-center gap-2.5 rounded-xl py-1 pl-2 pr-1 transition hover:bg-white/[.06]"
                >
                    <Avatar name={user?.name ?? 'Admin'} size="sm" />
                    <span className="hidden text-right sm:block">
                        <span className="block text-[13px] font-medium leading-tight text-white">{user?.name ?? '—'}</span>
                        <span className="block text-[11px] leading-tight text-neutral-500">{user?.roles?.[0] ?? 'ادمین'}</span>
                    </span>
                    <ChevronDown className="size-4 text-neutral-500" />
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                            className="absolute left-0 mt-2 w-60 origin-top-left overflow-hidden rounded-xl bg-neutral-900 p-1.5 ring-1 ring-white/10 shadow-2xl shadow-black/50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-3 py-2.5">
                                <p className="text-sm font-medium text-white">{user?.name}</p>
                                <p className="truncate text-xs text-neutral-500" dir="ltr">
                                    {user?.email}
                                </p>
                                {user?.last_login_ip && (
                                    <p className="mt-1 text-[11px] text-neutral-600">
                                        آخرین ورود از <span className="font-mono">{user.last_login_ip}</span>
                                    </p>
                                )}
                            </div>
                            <div className="my-1 h-px bg-white/[.06]" />
                            <MenuItem icon={CircleUser} label="پروفایل" onClick={() => setOpen(false)} />
                            <MenuItem icon={FileText} label="مستندات API" onClick={() => setOpen(false)} />
                            <div className="my-1 h-px bg-white/[.06]" />
                            <MenuItem icon={LogOut} label="خروج از پنل" danger onClick={() => router.post(route('admin.logout'))} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof LogOut; label: string; onClick: () => void; danger?: boolean }) {
    return (
        <button onClick={onClick} className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition', danger ? 'text-rose-300 hover:bg-rose-500/10' : 'text-neutral-300 hover:bg-white/[.06] hover:text-white')}>
            <Icon className="size-4" />
            {label}
        </button>
    );
}
