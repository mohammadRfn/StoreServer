import type {
    ActivationStatus,
    CodeStatus,
    CustomerStatus,
    DevicePatchState,
    DurationType,
    LicenseStatus,
    LogCategory,
    PatchStatus,
    PatchTargetType,
} from '@/types';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'violet';

export interface StatusMeta {
    label: string;
    tone: Tone;
    pulse?: boolean;
}

export const licenseStatus: Record<LicenseStatus, StatusMeta> = {
    unactivated: { label: 'فعال‌نشده', tone: 'neutral' },
    active: { label: 'فعال', tone: 'success', pulse: true },
    suspended: { label: 'معلق', tone: 'warning' },
    expired: { label: 'منقضی', tone: 'danger' },
    revoked: { label: 'باطل‌شده', tone: 'danger' },
};

export const customerStatus: Record<CustomerStatus, StatusMeta> = {
    active: { label: 'فعال', tone: 'success' },
    inactive: { label: 'غیرفعال', tone: 'neutral' },
};

export const activationStatus: Record<ActivationStatus, StatusMeta> = {
    pending: { label: 'در انتظار', tone: 'amber', pulse: true },
    approved: { label: 'تأییدشده', tone: 'success' },
    rejected: { label: 'ردشده', tone: 'danger' },
};

export const codeStatus: Record<CodeStatus, StatusMeta> = {
    active: { label: 'قابل استفاده', tone: 'success' },
    used: { label: 'استفاده‌شده', tone: 'info' },
    expired: { label: 'منقضی', tone: 'neutral' },
    revoked: { label: 'باطل‌شده', tone: 'danger' },
};

export const patchStatus: Record<PatchStatus, StatusMeta> = {
    draft: { label: 'پیش‌نویس', tone: 'neutral' },
    scheduled: { label: 'زمان‌بندی‌شده', tone: 'amber', pulse: true },
    published: { label: 'منتشرشده', tone: 'success' },
    withdrawn: { label: 'لغوشده', tone: 'danger' },
};

export const devicePatchState: Record<DevicePatchState, StatusMeta> = {
    offered: { label: 'پیشنهادشده', tone: 'info' },
    downloading: { label: 'در حال دانلود', tone: 'amber', pulse: true },
    applied: { label: 'اعمال‌شده', tone: 'success' },
    failed: { label: 'ناموفق', tone: 'danger' },
    skipped: { label: 'ردشده', tone: 'neutral' },
};

export const durationType: Record<DurationType, string> = {
    monthly: 'ماهانه',
    yearly: 'سالانه',
    permanent: 'دائمی',
};

export const patchTargetType: Record<PatchTargetType, string> = {
    all: 'همه دستگاه‌ها',
    plans: 'پلن‌های خاص',
    licenses: 'لایسنس‌های خاص',
};

export const logCategory: Record<LogCategory, { label: string; description: string }> = {
    audit: { label: 'ممیزی', description: 'اقدامات ادمین‌ها در پنل' },
    license: { label: 'لایسنس', description: 'رویدادهای چرخه عمر لایسنس' },
    heartbeat: { label: 'ضربان', description: 'گزارش‌های دوره‌ای کلاینت' },
    device: { label: 'دستگاه', description: 'رویدادهای دستگاه' },
    security: { label: 'امنیتی', description: 'تلاش‌های مشکوک و نقض امضا' },
    api: { label: 'API', description: 'درخواست‌های کلاینت' },
    error: { label: 'خطا', description: 'استثناهای سرور' },
    patch: { label: 'دانلود پچ', description: 'دانلودهای پچ توسط دستگاه‌ها' },
};

export const toneClasses: Record<Tone, string> = {
    neutral: 'bg-neutral-500/10 text-neutral-300 ring-neutral-500/20',
    success: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25',
    warning: 'bg-orange-500/10 text-orange-300 ring-orange-500/25',
    danger: 'bg-rose-500/10 text-rose-300 ring-rose-500/25',
    info: 'bg-sky-500/10 text-sky-300 ring-sky-500/25',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/25',
    violet: 'bg-violet-500/10 text-violet-300 ring-violet-500/25',
};

export const toneDot: Record<Tone, string> = {
    neutral: 'bg-neutral-400',
    success: 'bg-emerald-400',
    warning: 'bg-orange-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
    amber: 'bg-amber-400',
    violet: 'bg-violet-400',
};

export const permissionGroupLabels: Record<string, string> = {
    admin: 'مدیریت ادمین‌ها',
    setting: 'تنظیمات',
    customer: 'مشتریان',
    plan: 'پلن‌ها',
    license: 'لایسنس‌ها',
    device: 'دستگاه‌ها',
    patch: 'پچ‌ها',
    log: 'لاگ‌ها',
};
