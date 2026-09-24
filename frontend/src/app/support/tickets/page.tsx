'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSupportMyTickets } from '@/hooks/use-support-queries';
import { isSupportAuthFailure } from '@/lib/support/validation';
import { S } from '../_components/support-design';
import { PriorityBadge, SlaBadge, StatusBadge, SupportEmptyState, SupportErrorState, SupportSkeleton } from '../_components/support-ui';

const STATUS_FILTERS = [
    { value: '', label: 'الكل' },
    { value: 'open', label: 'مفتوحة' },
    { value: 'in_progress', label: 'قيد المعالجة' },
    { value: 'waiting_for_user', label: 'بانتظارك' },
    { value: 'resolved', label: 'تم الحل' },
    { value: 'closed', label: 'مغلقة' },
];

/**
 * The signed-in user's tickets.
 *
 * Each filter is its own cached query key, so switching tabs is instant on the
 * way back. A 401 is detected through the shared error taxonomy (not by
 * string-matching the message) and switches straight to the sign-in state;
 * retries are skipped for it since it can never succeed.
 */
export default function MyTicketsPage() {
    const [status, setStatus] = useState('');
    const ticketsQuery = useSupportMyTickets(status);
    const unauthorized = isSupportAuthFailure(ticketsQuery.error);
    const tickets = ticketsQuery.data?.data ?? [];

    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <div className={S.sectionHead}>
                        <div>
                            <h1 className={S.sectionTitle}>تذاكري</h1>
                            <p className={S.sectionSub}>تابع طلبات الدعم الخاصة بك</p>
                        </div>
                        <Link href="/support/tickets/new" className={S.btnPrimary}>
                            تذكرة جديدة
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية حسب الحالة">
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                role="tab"
                                aria-selected={status === f.value}
                                onClick={() => setStatus(f.value)}
                                className={status === f.value ? S.filterActive : S.filterIdle}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5" aria-live="polite">
                        {ticketsQuery.isPending ? (
                            <SupportSkeleton lines={4} />
                        ) : unauthorized ? (
                            <SupportEmptyState
                                title="سجّل الدخول لعرض تذاكرك"
                                hint="إدارة تذاكر الدعم متاحة للحسابات المسجلة."
                                action={
                                    <Link href="/login" className={`inline-block ${S.btnPrimary}`}>
                                        تسجيل الدخول
                                    </Link>
                                }
                            />
                        ) : ticketsQuery.isError ? (
                            <SupportErrorState
                                message="تعذّر تحميل التذاكر. حاول مجدداً."
                                onRetry={() => void ticketsQuery.refetch()}
                            />
                        ) : tickets.length === 0 ? (
                            <SupportEmptyState
                                title="لا توجد طلبات دعم بعد"
                                hint="افتح تذكرة وسيرد عليك فريق الدعم."
                                action={
                                    <Link href="/support/tickets/new" className={`inline-block ${S.btnPrimary}`}>
                                        فتح تذكرة
                                    </Link>
                                }
                            />
                        ) : (
                            <ul className="space-y-3">
                                {tickets.map((t) => (
                                    <li key={t.id}>
                                        <Link href={`/support/tickets/${encodeURIComponent(t.id)}`} className={`group block ${S.card} ${S.cardHover} p-4`}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={S.mono} dir="ltr">{t.ticketNumber}</span>
                                                <StatusBadge status={t.status} />
                                                <PriorityBadge priority={t.priority} />
                                                <SlaBadge status={t.slaStatus} />
                                            </div>
                                            <span className="mt-2 block font-bold group-hover:text-[#0F766E] dark:group-hover:text-orange-500">{t.subject}</span>
                                            <span className={`${S.caption} mt-1 block`}>
                                                آخر تحديث: {new Date(t.updatedAt).toLocaleDateString('ar-EG')}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
