'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SUPPORT_SEARCH_MIN_LENGTH, useSupportSearch } from '@/hooks/use-support-queries';
import { SUPPORT_SEARCH_MAX_LENGTH, sanitizeSupportSearchQuery } from '@/lib/support/validation';
import { S } from '../_components/support-design';
import { SupportEmptyState, SupportErrorState, SupportSkeleton } from '../_components/support-ui';

/** Pause after the last keystroke before the typed term is searched. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Knowledge-base search with live (type-to-search) behaviour.
 *
 *  - Whatever the user types becomes the searched term automatically after a
 *    short debounce — pressing the search button is optional (Enter / the
 *    button still trigger the search immediately).
 *  - The term is always sanitized (control characters stripped, whitespace
 *    collapsed, hard-capped) before it can reach the API, the DOM or the
 *    query cache.
 *  - Below SUPPORT_SEARCH_MIN_LENGTH nothing is requested at all.
 *  - React Query caches each term, cancels superseded requests through the
 *    forwarded AbortSignal, and keeps the previous results visible while the
 *    next term resolves (no flicker, no spinners to animate).
 *  - The URL seeds the box and the first query (deep links / the hero search
 *    form); the form owns the state afterwards, with no effect-driven syncing.
 */
export default function SupportSearchPage() {
    const params = useSearchParams();
    const initial = sanitizeSupportSearchQuery(params.get('q'));
    const [query, setQuery] = useState(initial);
    const [submitted, setSubmitted] = useState(initial);

    // Type-to-search: promote the typed term to the searched term after the
    // user pauses. Identical terms are ignored so React Query's cache does the
    // rest, and the debounce timer (not the request) is what gets reset on
    // every keystroke — superseded in-flight requests are cancelled by the
    // AbortSignal forwarded from the query itself.
    useEffect(() => {
        const next = sanitizeSupportSearchQuery(query);
        if (next === submitted) return;
        const timer = setTimeout(() => setSubmitted(next), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [query, submitted]);

    const search = useSupportSearch(submitted);
    const normalized = sanitizeSupportSearchQuery(submitted);
    const tooShort = normalized.length < SUPPORT_SEARCH_MIN_LENGTH;
    const results = search.data;
    const hasResults = Boolean(results && (results.articles.length > 0 || results.faqs.length > 0));

    function onSubmit(event: React.FormEvent) {
        // Optional fast path: Enter / the button search immediately instead of
        // waiting for the debounce to elapse.
        event.preventDefault();
        const next = sanitizeSupportSearchQuery(query);
        setQuery(next);
        setSubmitted(next);
    }

    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <h1 className={S.sectionTitle}>البحث في المساعدة</h1>
                    <p className={S.sectionSub}>ابحث في مقالات المساعدة والأسئلة الشائعة</p>
                    <form className="mt-5 flex gap-2" role="search" onSubmit={onSubmit}>
                        <label htmlFor="q" className="sr-only">كلمة البحث</label>
                        <input
                            id="q"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="ابحث في المقالات والأسئلة الشائعة…"
                            className={S.input}
                            maxLength={SUPPORT_SEARCH_MAX_LENGTH}
                            autoComplete="off"
                        />
                        <button type="submit" className={`${S.btnPrimary} shrink-0`}>
                            بحث
                        </button>
                    </form>

                    <div className="mt-6" aria-live="polite">
                        {tooShort ? (
                            <SupportEmptyState
                                title={normalized.length === 0 ? 'اكتب كلمة للبحث' : 'أكمل الكلمة للبحث'}
                                hint={`ابحث في مقالات المساعدة والأسئلة الشائعة (${SUPPORT_SEARCH_MIN_LENGTH} أحرف على الأقل).`}
                            />
                        ) : search.isError && !results ? (
                            <SupportErrorState
                                message="تعذّر تنفيذ البحث. تحقق من الاتصال وحاول مجدداً."
                                onRetry={() => void search.refetch()}
                            />
                        ) : search.isPending ? (
                            <SupportSkeleton lines={4} />
                        ) : !hasResults ? (
                            <SupportEmptyState
                                title={`لا توجد نتائج لـ "${normalized}"`}
                                hint="جرّب كلمات مختلفة أو تصفح الفئات أو افتح تذكرة دعم."
                                action={
                                    <Link href="/support/tickets/new" className={`inline-block ${S.btnPrimary}`}>
                                        فتح تذكرة دعم
                                    </Link>
                                }
                            />
                        ) : (
                            <div className="space-y-6">
                                {results && results.articles.length > 0 && (
                                    <section aria-label="مقالات">
                                        <h2 className="mb-3 font-black">مقالات ({results.articles.length})</h2>
                                        <ul className="space-y-3">
                                            {results.articles.map((a) => (
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
                                {results && results.faqs.length > 0 && (
                                    <section aria-label="أسئلة شائعة">
                                        <h2 className="mb-3 font-black">أسئلة شائعة ({results.faqs.length})</h2>
                                        <ul className="space-y-3">
                                            {results.faqs.map((f) => (
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

