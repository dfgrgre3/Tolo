'use client';

import Link from 'next/link';
import { useSupportIncidents, useSupportStatus } from '@/hooks/use-support-queries';
import type { SupportIncident, SupportServiceStatus } from '@/services/api/support-service';
import { S } from './support-design';
import { StatusBadge, SupportErrorState, SupportSkeleton } from './support-ui';

export interface StatusClientProps {
    /** Server-rendered status payload; null when the SSR read failed. */
    initialStatus?: { overall: string; services: SupportServiceStatus[] } | null;
    /** Server-rendered incident history; null when the SSR read failed. */
    initialIncidents?: SupportIncident[] | null;
}

/**
 * Operational status + incident history.
 *
 * Status and incidents are separate queries so an incident-history hiccup never
 * blanks the live service table (the previous implementation shared one
 * `Promise.all` failure path). The dashboard profile keeps both reasonably
 * fresh while the tab stays open, and retries stop immediately on 401.
 */
export function StatusClient({ initialStatus, initialIncidents }: StatusClientProps) {
    const statusQuery = useSupportStatus(initialStatus);
    const incidentsQuery = useSupportIncidents(initialIncidents);

    const statusFailed = statusQuery.isError && !statusQuery.data;
    const incidentsFailed = incidentsQuery.isError && !incidentsQuery.data;
    const services = statusQuery.data?.services ?? [];
    const overall = statusQuery.data?.overall ?? 'operational';
    const incidents = incidentsQuery.data ?? [];

    if (statusQuery.isPending || incidentsQuery.isPending) {
        return <SupportSkeleton lines={6} />;
    }

    if (statusFailed) {
        return (
            <SupportErrorState
                message="تعذّر تحميل حالة النظام حالياً."
                onRetry={() => {
                    void statusQuery.refetch();
                    void incidentsQuery.refetch();
                }}
            />
        );
    }

    return (
        <>
            <div className={`${S.card} p-5 sm:p-6`}>
                <div className="flex items-center gap-3">
                    <span className="font-black">الحالة العامة:</span>
                    <StatusBadge status={overall} />
                </div>
                <ul className="mt-4">
                    {services.map((s) => (
                        <li key={s.key} className="py-3 border-t border-[#E2E8F0] dark:border-slate-800 first:border-t-0 first:pt-0 last:pb-0 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-bold">
                                    {s.nameAr}
                                    {s.mode === 'manual' && (
                                        <span className={`mr-2 rounded-full border border-[#E2E8F0] dark:border-slate-700 px-2 py-0.5 text-[10px] ${S.caption}`}>
                                            يدوي
                                        </span>
                                    )}
                                </span>
                                <StatusBadge status={s.status} />
                            </div>
                            {s.detail && <p className={`${S.caption} mt-1`}>{s.detail}</p>}
                        </li>
                    ))}
                </ul>
            </div>

            <h2 className="mt-8 mb-4 text-xl font-black">الأعطال والتحديثات</h2>
            {incidentsFailed ? (
                <div className={`${S.card} p-6`}>
                    <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">تعذّر تحميل سجل الأعطال.</p>
                    <button type="button" onClick={() => void incidentsQuery.refetch()} className={`${S.btnSecondary} mt-3`}>
                        إعادة المحاولة
                    </button>
                </div>
            ) : incidents.length === 0 ? (
                <p className={`${S.card} p-6 text-sm text-[#64748B] dark:text-slate-400 font-medium`}>
                    لا توجد أعطال مُعلنة. جميع الأنظمة تعمل بشكل طبيعي.
                </p>
            ) : (
                <ul className="space-y-4">
                    {incidents.map((inc) => (
                        <li key={inc.id} className={`${S.card} p-5 sm:p-6`}>
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={inc.status} />
                                <span className={S.caption}>{new Date(inc.createdAt).toLocaleDateString('ar-EG')}</span>
                            </div>
                            <h3 className="mt-2 font-black">{inc.titleAr}</h3>
                            {(inc.updates ?? []).length > 0 && (
                                <ol className="mt-4 space-y-3 border-r-2 border-[#0F766E]/20 dark:border-orange-500/20 pr-4">
                                    {inc.updates!.map((u) => (
                                        <li key={u.id} className="text-sm">
                                            <span className={`block ${S.caption}`}>{new Date(u.createdAt).toLocaleString('ar-EG')}</span>
                                            <span>{u.messageAr}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <Link href="/support" className="mt-8 inline-block text-sm font-bold text-[#0F766E] dark:text-orange-500">
                العودة لمركز المساعدة
            </Link>
        </>
    );
}
