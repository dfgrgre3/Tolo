'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supportService, type SupportArticleSummary, type SupportServiceStatus } from '@/services/api/support-service';
import { S } from './support-design';
import { StatusBadge } from './support-ui';

const CATEGORY_LABELS: Record<string, string> = {
    technical: 'مشاكل تقنية',
    billing: 'الدفع والفواتير',
    content: 'المحتوى التعليمي',
    account: 'الحساب',
    other: 'أخرى',
};

export function SupportHomeClient() {
    const [popular, setPopular] = useState<SupportArticleSummary[]>([]);
    const [services, setServices] = useState<SupportServiceStatus[]>([]);
    const [overall, setOverall] = useState('operational');
    const [statusFailed, setStatusFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [articles, status] = await Promise.all([
                    supportService.listArticles({ limit: 6, sort: 'popular' }),
                    supportService.getStatus(),
                ]);
                if (cancelled) return;
                setPopular(articles.data);
                setServices(status.services.slice(0, 6));
                setOverall(status.overall);
            } catch {
                if (!cancelled) setStatusFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className={S.section} aria-label="المحتوى الشائع وحالة النظام">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className={S.sectionHead}>
                        <div>
                            <h2 className={S.sectionTitle}>مقالات شائعة</h2>
                            <p className={S.sectionSub}>الأكثر قراءة في مركز المساعدة</p>
                        </div>
                        <Link href="/support/search" className={S.viewAll}>
                            عرض الكل ←
                        </Link>
                    </div>
                    {popular.length === 0 ? (
                        <div className={`${S.card} ${S.cardPad}`}>
                            <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">
                                لا توجد مقالات منشورة بعد. جرّب{' '}
                                <Link className="font-bold text-[#0F766E] dark:text-orange-500" href="/support/faq">الأسئلة الشائعة</Link>{' '}
                                أو <Link className="font-bold text-[#0F766E] dark:text-orange-500" href="/support/tickets/new">افتح تذكرة</Link>.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {popular.map((a) => (
                                <li key={a.slug}>
                                    <Link href={`/support/articles/${encodeURIComponent(a.slug)}`} className={`group block ${S.card} ${S.cardHover} p-4`}>
                                        <span className="px-2.5 py-1 text-xs font-bold text-white bg-[#0F766E] rounded-md dark:bg-orange-600">
                                            {CATEGORY_LABELS[a.category] ?? a.category}
                                        </span>
                                        <span className="mt-2 block text-base font-bold text-[#1E293B] dark:text-white group-hover:text-[#0F766E] dark:group-hover:text-orange-500">
                                            {a.titleAr}
                                        </span>
                                        {a.summaryAr ? (
                                            <span className="mt-1 block text-xs text-[#64748B] dark:text-slate-400">{a.summaryAr}</span>
                                        ) : null}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <div className={S.sectionHead}>
                        <div>
                            <h2 className={S.sectionTitle}>حالة النظام</h2>
                            <p className={S.sectionSub}>الوضع التشغيلي الحالي</p>
                        </div>
                    </div>
                    <div className={`${S.card} ${S.cardPad}`}>
                        {statusFailed ? (
                            <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">
                                تعذّر تحميل الحالة حالياً.{' '}
                                <Link className="font-bold text-[#0F766E] dark:text-orange-500" href="/support/status">حاول مجدداً</Link>.
                            </p>
                        ) : (
                            <>
                                <StatusBadge status={overall} />
                                <ul className="mt-4 space-y-2">
                                    {services.map((s) => (
                                        <li key={s.key} className="py-2 border-t border-[#E2E8F0] dark:border-slate-800 first:border-t-0 first:pt-0 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold">{s.nameAr}</span>
                                                <StatusBadge status={s.status} />
                                            </div>
                                            {s.detail && <p className={`${S.caption} mt-1`}>{s.detail}</p>}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/support/status" className={`${S.viewAll} mt-4`}>
                                    التفاصيل والأعطال ←
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
