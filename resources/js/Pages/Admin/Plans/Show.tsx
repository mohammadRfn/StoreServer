import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Boxes, Check, Gauge } from 'lucide-react';
import { Badge } from '@/Components/ui/Badge';
import { Card, CardHeader } from '@/Components/ui/Card';
import { KeyValue } from '@/Components/ui/KeyValue';
import { PageHeader } from '@/Components/ui/PageHeader';
import AdminLayout from '@/Layouts/AdminLayout';
import { listItem, stagger } from '@/lib/motion';
import { durationType } from '@/lib/status';
import { formatDate, formatNumber, formatPrice } from '@/lib/utils';
import type { GameshopModule, PageProps, Plan } from '@/types';

type Props = PageProps<{ plan: Plan & { modules?: GameshopModule[] }; entitlements: string[] }>;

export default function PlanShow({ plan, entitlements }: Props) {
    return (
        <>
            <Head title={`پلن ${plan.name}`} />
            <PageHeader breadcrumbs={[{ label: 'پلن‌ها', href: route('admin.plans.index') }, { label: plan.name }]} title={plan.name} badge={<Badge tone={plan.is_active ? 'success' : 'neutral'} dot>{plan.is_active ? 'فعال' : 'غیرفعال'}</Badge>} description={<span className="font-mono">{plan.code}</span>} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Card>
                    <CardHeader title="مشخصات" action={<Boxes className="size-5 text-neutral-500" />} />
                    <KeyValue columns={1} items={[
                        { label: 'قیمت', value: <span className="text-lg font-bold text-white">{formatPrice(plan.price_irr)}</span> },
                        { label: 'مدت پیش‌فرض', value: durationType[plan.default_duration] },
                        { label: 'ترتیب نمایش', value: formatNumber(plan.sort_order) },
                        { label: 'توضیحات', value: plan.description || '—' },
                        { label: 'ایجاد', value: formatDate(plan.created_at) },
                    ]} />
                </Card>
                <Card>
                    <CardHeader title="Entitlement نهایی" description="کلیدهایی که در توکن لایسنس این پلن قرار می‌گیرند" action={<Check className="size-5 text-neutral-500" />} />
                    <motion.ul variants={stagger(0.04)} initial="hidden" animate="show" className="flex flex-wrap gap-2">
                        {entitlements.map((k) => <motion.li key={k} variants={listItem}><span className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 font-mono text-xs text-emerald-200 ring-1 ring-emerald-500/20">{k}</span></motion.li>)}
                    </motion.ul>
                    <p className="mt-4 text-xs text-neutral-500">ماژول‌های پلن: {plan.modules?.map((m) => m.title).join('، ') || '—'}</p>
                </Card>
                <Card>
                    <CardHeader title="محدودیت‌ها" action={<Gauge className="size-5 text-neutral-500" />} />
                    {plan.limits?.length ? (
                        <ul className="divide-y divide-white/[.05]">
                            {plan.limits.map((l) => <li key={l.limit_key} className="flex items-center justify-between py-2.5 text-sm"><span className="font-mono text-neutral-300">{l.limit_key}</span><span className="font-semibold text-white">{l.limit_value === null ? '∞' : formatNumber(l.limit_value)}</span></li>)}
                        </ul>
                    ) : <p className="text-sm text-neutral-500">بدون محدودیت</p>}
                </Card>
            </div>
        </>
    );
}

PlanShow.layout = (page: React.ReactNode) => <AdminLayout>{page}</AdminLayout>;
