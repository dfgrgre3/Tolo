'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useSupportFaqs } from '@/hooks/use-support-queries';
import type { SupportFaq } from '@/services/api/support-service';
import { S } from './support-design';
import { SupportErrorState, SupportSkeleton } from './support-ui';

const CATEGORY_TITLES: Record<string, string> = {
    general: 'عام',
    account: 'الحساب والتسجيل',
    courses: 'الدورات والدراسة',
    billing: 'الاشتراكات والمدفوعات',
    certificates: 'الشهادات والدعم',
};

/**
 * FAQ list grouped by category.
 *
 * `initialFaqs` carries the server-rendered payload (SEO + instant paint) while
 * the query keeps owning refresh/retry. Grouping is memoized so unrelated
 * re-renders do not re-bucket the list, and native `<details>` keeps the
 * accordion JS-free and animation-free.
 */
export function FaqClient({ initialFaqs }: { initialFaqs?: SupportFaq[] | null }) {
    const faqsQuery = useSupportFaqs(initialFaqs);
    const faqs = useMemo(() => faqsQuery.data ?? [], [faqsQuery.data]);

    const groups = useMemo(() => {
        const bucket = new Map<string, SupportFaq[]>();
        for (const faq of faqs) {
            const list = bucket.get(faq.category);
            if (list) {
                list.push(faq);
            } else {
                bucket.set(faq.category, [faq]);
            }
        }
        return [...bucket.entries()];
    }, [faqs]);

    if (faqsQuery.isPending) return <SupportSkeleton lines={5} />;

    // Only surface the error state when there is nothing to show; a failed
    // refresh keeps the previously rendered answers on screen.
    if (faqsQuery.isError && !faqsQuery.data) {
        return (
            <SupportErrorState
                message="تعذّر تحميل الأسئلة الشائعة."
                onRetry={() => void faqsQuery.refetch()}
            />
        );
    }

    if (faqs.length === 0) {
        return (
            <div className={`${S.card} p-10 text-center`}>
                <HelpCircle className="h-12 w-12 text-[#64748B] mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold">لا توجد أسئلة منشورة حالياً.</p>
                <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">
                    يمكنك مراجعة <Link href="/faq" className="font-bold text-[#0F766E] dark:text-orange-500">صفحة الأسئلة الثابتة</Link> أو التواصل مع الدعم مباشرة.
                </p>
                <Link href="/support/tickets/new" className={`mt-6 inline-block ${S.btnPrimary}`}>
                    فتح تذكرة دعم
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {groups.map(([cat, items]) => (
                <section key={cat} className={`${S.card} p-5 sm:p-6`}>
                    <h2 className="mb-4 text-lg font-black">{CATEGORY_TITLES[cat] ?? cat}</h2>
                    <div className="space-y-3">
                        {items.map((item) => (
                            <details
                                key={item.id}
                                className="group rounded-[12px] border border-[#E2E8F0] dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 open:border-[#0F766E] dark:open:border-orange-500"
                            >
                                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-bold [&::-webkit-details-marker]:hidden">
                                    <ChevronDown className="h-5 w-5 shrink-0 text-[#0F766E] dark:text-orange-500 group-open:rotate-180" />
                                    <span>{item.question}</span>
                                </summary>
                                <p className="px-4 pb-5 pr-12 text-sm leading-relaxed text-[#64748B] dark:text-slate-400">
                                    {item.answer}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
