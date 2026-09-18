'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { supportService, type SupportFaq } from '@/services/api/support-service';
import { S } from './support-design';
import { SupportErrorState, SupportSkeleton } from './support-ui';

const CATEGORY_TITLES: Record<string, string> = {
    general: 'عام',
    account: 'الحساب والتسجيل',
    courses: 'الدورات والدراسة',
    billing: 'الاشتراكات والمدفوعات',
    certificates: 'الشهادات والدعم',
};

export function FaqClient() {
    const [faqs, setFaqs] = useState<SupportFaq[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const items = await supportService.listFaqs();
                if (!cancelled) setFaqs(items);
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (failed) {
        return (
            <SupportErrorState
                message="تعذّر تحميل الأسئلة الشائعة."
                onRetry={() => {
                    setFailed(false);
                    supportService.listFaqs().then(setFaqs).catch(() => setFailed(true));
                }}
            />
        );
    }

    if (faqs === null) return <SupportSkeleton lines={5} />;

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

    const groups = new Map<string, SupportFaq[]>();
    for (const f of faqs) {
        const list = groups.get(f.category) ?? [];
        list.push(f);
        groups.set(f.category, list);
    }

    return (
        <div className="space-y-6">
            {[...groups.entries()].map(([cat, items]) => (
                <section key={cat} className={`${S.card} p-5 sm:p-6`}>
                    <h2 className="mb-4 text-lg font-black">{CATEGORY_TITLES[cat] ?? cat}</h2>
                    <div className="space-y-3">
                        {items.map((item) => (
                            <details key={item.id} className="group rounded-[12px] border border-[#E2E8F0] dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 open:border-[#0F766E] dark:open:border-orange-500">
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
