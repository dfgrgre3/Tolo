'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supportService, type SupportTicket } from '@/services/api/support-service';
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

export default function MyTicketsPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unauthorized, setUnauthorized] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await supportService.listMyTickets({ status: status || undefined, limit: 50 });
                if (!cancelled) setTickets(res.data);
            } catch (e) {
                if (cancelled) return;
                const msg = e instanceof Error ? e.message : '';
                if (msg.includes('401')) setUnauthorized(true);
                else setError('تعذّر تحميل التذاكر. حاول مجدداً.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [status, retryKey]);

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
                        {loading ? (
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
                        ) : error ? (
                            <SupportErrorState message={error} onRetry={() => setRetryKey((k) => k + 1)} />
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
