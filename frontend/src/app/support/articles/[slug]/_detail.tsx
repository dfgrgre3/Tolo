'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { supportService, type SupportArticle } from '@/services/api/support-service';
import { S } from '../../_components/support-design';
import { SupportErrorState, SupportSkeleton } from '../../_components/support-ui';
import { ArticleVote } from './_vote';

export function ArticleDetail({ slug }: { slug: string }) {
    const [article, setArticle] = useState<SupportArticle | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const a = await supportService.getArticle(slug);
                if (!cancelled) setArticle(a);
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (failed) {
        return (
            <SupportErrorState
                message="تعذّر تحميل المقالة. قد تكون محذوفة أو غير منشورة."
                onRetry={() => {
                    setFailed(false);
                    supportService.getArticle(slug).then(setArticle).catch(() => setFailed(true));
                }}
            />
        );
    }

    if (!article) return <SupportSkeleton lines={6} />;

    return (
        <>
            <nav aria-label="مسار التنقل" className="mb-5 flex items-center gap-2 text-xs font-bold text-[#64748B] dark:text-slate-400">
                <Link href="/support" className="hover:text-[#0F766E] dark:hover:text-orange-500">الدعم</Link>
                <ChevronLeft className="h-3 w-3 rotate-180" />
                <Link href="/support/search" className="hover:text-[#0F766E] dark:hover:text-orange-500">المقالات</Link>
                <ChevronLeft className="h-3 w-3 rotate-180" />
                <span className="text-[#1E293B] dark:text-white">{article.titleAr}</span>
            </nav>
            <div className={`${S.card} p-6 sm:p-8`}>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{article.titleAr}</h1>
                <p className={`${S.caption} mt-2`}>
                    آخر تحديث: {new Date(article.updatedAt).toLocaleDateString('ar-EG')} • {article.views} مشاهدة
                </p>
                <article className="mt-6 space-y-3 text-sm leading-relaxed text-[#1E293B] dark:text-slate-200">
                    {article.contentAr.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </article>
                {article.tags && article.tags.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                        {article.tags.map((t) => (
                            <span key={t} className={S.tag}>{t}</span>
                        ))}
                    </div>
                )}
            </div>
            <ArticleVote slug={slug} />
            <div className="mt-6 bg-[#0F766E] dark:bg-slate-900 dark:border dark:border-slate-800 rounded-[12px] p-6 text-center">
                <p className="font-black text-white">لم تحل المقالة مشكلتك؟</p>
                <Link href="/support/tickets/new" className="mt-4 inline-block px-6 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-sm rounded-[8px]">
                    فتح تذكرة دعم
                </Link>
            </div>
        </>
    );
}
