'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supportService, type SupportArticleSummary, type SupportFaq } from '@/services/api/support-service';
import { S } from '../_components/support-design';
import { SupportEmptyState, SupportErrorState, SupportSkeleton } from '../_components/support-ui';

export default function SupportSearchPage() {
    const params = useSearchParams();
    const initial = params.get('q') ?? '';
    const [query, setQuery] = useState(initial);
    const [submitted, setSubmitted] = useState(initial);
    const [loading, setLoading] = useState(!!initial);
    const [error, setError] = useState<string | null>(null);
    const [articles, setArticles] = useState<SupportArticleSummary[]>([]);
    const [faqs, setFaqs] = useState<SupportFaq[]>([]);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        if (!submitted.trim()) return;
        let cancelled = false;
        const t = setTimeout(() => {
            (async () => {
                try {
                    const [a, f] = await Promise.all([
                        supportService.listArticles({ search: submitted.trim(), limit: 20 }),
                        supportService.listFaqs({ search: submitted.trim() }),
                    ]);
                    if (cancelled) return;
                    setArticles(a.data);
                    setFaqs(f);
                    setError(null);
                } catch {
                    if (!cancelled) setError('تعذّر تنفيذ البحث. تحقق من الاتصال وحاول مجدداً.');
                } finally {
                    if (!cancelled) setLoading(false);
                }
            })();
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [submitted, retryKey]);

    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <h1 className={S.sectionTitle}>البحث في المساعدة</h1>
                    <p className={S.sectionSub}>ابحث في مقالات المساعدة والأسئلة الشائعة</p>
                    <form
                        className="mt-5 flex gap-2"
                        role="search"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setLoading(true);
                            setError(null);
                            setSubmitted(query);
                        }}
                    >
                        <label htmlFor="q" className="sr-only">كلمة البحث</label>
                        <input
                            id="q"
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ابحث في المقالات والأسئلة الشائعة…"
                            className={S.input}
                        />
                        <button type="submit" className={`${S.btnPrimary} shrink-0`}>
                            بحث
                        </button>
                    </form>

                    <div className="mt-6" aria-live="polite">
                        {loading ? (
                            <SupportSkeleton lines={4} />
                        ) : error ? (
                            <SupportErrorState message={error} onRetry={() => { setLoading(true); setRetryKey((k) => k + 1); }} />
                        ) : !submitted.trim() ? (
                            <SupportEmptyState title="اكتب كلمة للبحث" hint="ابحث في مقالات المساعدة والأسئلة الشائعة." />
                        ) : articles.length === 0 && faqs.length === 0 ? (
                            <SupportEmptyState
                                title={`لا توجد نتائج لـ "${submitted}"`}
                                hint="جرّب كلمات مختلفة أو تصفح الفئات أو افتح تذكرة دعم."
                                action={
                                    <Link href="/support/tickets/new" className={`inline-block ${S.btnPrimary}`}>
                                        فتح تذكرة دعم
                                    </Link>
                                }
                            />
                        ) : (
                            <div className="space-y-6">
                                {articles.length > 0 && (
                                    <section aria-label="مقالات">
                                        <h2 className="mb-3 font-black">مقالات ({articles.length})</h2>
                                        <ul className="space-y-3">
                                            {articles.map((a) => (
                                                <li key={a.slug}>
                                                    <Link href={`/support/articles/${encodeURIComponent(a.slug)}`} className={`group block ${S.card} ${S.cardHover} p-4`}>
                                                        <span className="block font-bold group-hover:text-[#0F766E] dark:group-hover:text-orange-500">{a.titleAr}</span>
                                                        {a.summaryAr ? <span className="mt-1 block text-xs text-[#64748B] dark:text-slate-400">{a.summaryAr}</span> : null}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                                {faqs.length > 0 && (
                                    <section aria-label="أسئلة شائعة">
                                        <h2 className="mb-3 font-black">أسئلة شائعة ({faqs.length})</h2>
                                        <ul className="space-y-3">
                                            {faqs.map((f) => (
                                                <li key={f.id} className={`${S.card} p-4`}>
                                                    <span className="block font-bold">{f.question}</span>
                                                    <span className="mt-1 block text-sm text-[#64748B] dark:text-slate-400">{f.answer}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
