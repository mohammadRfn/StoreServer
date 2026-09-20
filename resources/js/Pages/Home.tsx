import { Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

export default function Home() {
    return (
        <>
            <Head title="خانه" />
            <main className="grid min-h-screen place-items-center bg-neutral-950 text-neutral-100">
                <div className="space-y-3 text-center">
                    <ShieldCheck className="mx-auto size-12 text-amber-400" />
                    <h1 className="text-2xl font-bold">سرور مدیریت لایسنس</h1>
                    <p className="text-neutral-400">React + TypeScript + Inertia آماده است</p>
                </div>
            </main>
        </>
    );
}