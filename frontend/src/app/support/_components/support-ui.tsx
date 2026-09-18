import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { S, badgeClass } from './support-design';

const STATUS_LABELS: Record<string, string> = {    open: 'مفتوحة',
    in_progress: 'قيد المعالجة',
    waiting_for_user: 'بانتظارك',
    resolved: 'تم الحل',
    closed: 'مغلقة',
    escalated: 'مُصعّدة',
    operational: 'تعمل',
    degraded: 'تباطؤ',
    partial_outage: 'عطل جزئي',
    major_outage: 'عطل رئيسي',
    maintenance: 'صيانة',
    investigating: 'جارٍ التحقيق',
    identified: 'تم التحديد',
    monitoring: 'قيد المراقبة',
};

const PRIORITY_LABELS: Record<string, string> = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    urgent: 'عاجلة',
};

export function StatusBadge({ status }: { status: string }) {
    return <span className={badgeClass(status)}>{STATUS_LABELS[status] ?? status}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
    return <span className={S.tag}>الأولوية: {PRIORITY_LABELS[priority] ?? priority}</span>;
}

const SLA_STYLES: Record<string, string> = {
    on_track:
        'bg-emerald-50 text-[#0F766E] border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    at_risk:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    breached: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    late: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    met: 'bg-emerald-50 text-[#0F766E] border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    closed: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
};

const SLA_LABELS: Record<string, string> = {
    on_track: 'ضمن الموعد',
    at_risk: 'يقترب الموعد',
    breached: 'تجاوز الموعد',
    late: 'حُل متأخراً',
    met: 'حُل في الموعد',
    closed: 'مغلقة',
};

export function SlaBadge({ status }: { status?: string }) {
    if (!status) return null;
    const cls =
        SLA_STYLES[status] ??
        'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${cls}`}>
            {SLA_LABELS[status] ?? status}
        </span>
    );
}

export function SupportEmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
    return (
        <div className={S.emptyWrap}>
            <Inbox className="h-12 w-12 text-[#64748B] mx-auto mb-4 opacity-50" />
            <p className="text-sm text-[#64748B] dark:text-slate-400 font-bold px-4">{title}</p>
            {hint ? <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400 px-4">{hint}</p> : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}

export function SupportErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-[12px] border border-red-200 dark:border-red-500/20">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4 opacity-70" />
            <p className="text-sm font-bold text-[#1E293B] dark:text-white">حدث خطأ</p>
            <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400 px-4">{message}</p>
            {onRetry ? (
                <button type="button" onClick={onRetry} className={`mt-6 ${S.btnPrimary}`}>
                    إعادة المحاولة
                </button>
            ) : null}
        </div>
    );
}

/** Static loading placeholder — deliberately no pulse animation. */
export function SupportSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="جارٍ التحميل">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className={`h-16 ${S.skeleton}`} />
            ))}
        </div>
    );
}
