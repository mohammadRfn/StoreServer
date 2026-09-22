import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cpu, Fingerprint, KeyRound, Package, ShieldCheck } from 'lucide-react';
import { EASE_OUT_EXPO, fadeUp, stagger } from '@/lib/motion';

const features = [
    { icon: KeyRound, title: 'صدور و مدیریت لایسنس', text: 'صدور، تمدید، تعلیق و ابطال لایسنس با تاریخچه کامل تغییرات.' },
    { icon: Fingerprint, title: 'اتصال به سخت‌افزار', text: 'قفل هر لایسنس به اثر انگشت دستگاه و بررسی ضربان دوره‌ای.' },
    { icon: Package, title: 'توزیع امن پچ', text: 'انتشار به‌روزرسانی‌های امضاشده با Ed25519 و لینک دانلود موقت.' },
    { icon: Cpu, title: 'پلن و ماژول', text: 'کنترل دقیق ماژول‌های فعال هر مشتری بر اساس پلن و استثناها.' },
];

export default function Home() {
    return (
        <>
            <Head title="خانه" />
            <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
                <div className="pointer-events-none absolute inset-0">
                    <motion.div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/[.09] blur-[140px]" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]" />
                </div>

                <motion.section variants={stagger(0.1, 0.1)} initial="hidden" animate="show" className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-28 text-center">
                    <motion.span variants={fadeUp} className="relative grid size-20 place-items-center rounded-3xl bg-amber-400 text-neutral-950 shadow-[0_30px_80px_-20px_rgba(251,191,36,.7)]">
                        <ShieldCheck className="size-10" />
                        <motion.span className="absolute -inset-3 rounded-[28px] border border-amber-400/30" animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }} />
                    </motion.span>
                    <motion.h1 variants={fadeUp} className="mt-10 text-4xl font-black tracking-tight text-white sm:text-6xl">
                        سرور مدیریت لایسنس
                        <span className="block bg-gradient-to-l from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">GameShop</span>
                    </motion.h1>
                    <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-balance text-base leading-8 text-neutral-400 sm:text-lg">
                        زیرساخت متمرکز صدور لایسنس، فعال‌سازی امن دستگاه‌ها، توزیع پچ‌های امضاشده و پایش کامل رویدادها — ساخته‌شده با Laravel، Inertia و React.
                    </motion.p>
                    <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
                        <Link href={route('admin.login')} className="group inline-flex h-12 items-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-semibold text-neutral-950 shadow-lg shadow-amber-400/30 transition hover:bg-amber-300">
                            ورود به پنل مدیریت
                            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                        </Link>
                        <a href="/api/v1/public-key" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/[.06] px-6 text-sm font-medium text-neutral-200 ring-1 ring-white/10 transition hover:bg-white/10">
                            کلید عمومی سرور
                        </a>
                    </motion.div>
                </motion.section>

                <motion.section variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="relative mx-auto grid max-w-6xl gap-4 px-6 pb-32 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((f) => (
                        <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -4 }} transition={{ duration: 0.3, ease: EASE_OUT_EXPO }} className="group relative overflow-hidden rounded-2xl bg-neutral-900/70 p-6 ring-1 ring-white/[.07]">
                            <div className="absolute -top-12 -left-12 size-32 rounded-full bg-amber-400/10 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                            <f.icon className="size-6 text-amber-300" />
                            <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-neutral-400">{f.text}</p>
                        </motion.div>
                    ))}
                </motion.section>
            </main>
        </>
    );
}
