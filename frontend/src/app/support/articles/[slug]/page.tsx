import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { SITE } from '@thanawy/shared/site-config';
import { toSafeJsonLd } from '@/lib/security/json-ld';
import { loadSupportArticle } from '@/lib/support/support-server';
import { S } from '../../_components/support-design';
import { SupportServerRetry } from '../../_components/server-retry';
import { ArticleDetail } from './_detail';

const FALLBACK_TITLE = `مقالات المساعدة | ${SITE.name}`;
const FALLBACK_DESCRIPTION = `مقالات وشروحات المساعدة في ${SITE.name}.`;

function canonicalUrlFor(slug: string) {
    return `${SITE.url}/support/articles/${encodeURIComponent(slug)}`;
}

/**
 * Per-article metadata straight from the backend (real title/description
 * instead of one generic snippet for every help article). `loadSupportArticle`
 * is request-cached, so this costs no extra backend call.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const result = await loadSupportArticle(slug);
    if (result.status !== 'ok') {
        return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
    }

    const article = result.article;
    const description = article.summaryAr?.trim() || `${article.titleAr} — مركز المساعدة في ${SITE.name}.`;
    const url = canonicalUrlFor(slug);

    return {
        title: `${article.titleAr} | ${SITE.name}`,
        description,
        alternates: { canonical: url },
        openGraph: {
            type: 'article',
            title: article.titleAr,
            description,
            url,
            locale: 'ar_EG',
            siteName: SITE.name,
        },
    };
}

export default async function SupportArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const result = await loadSupportArticle(slug);

    // Malformed slugs and backend 404s are indistinguishable to a visitor (and
    // must be: they say nothing about what exists).
    if (result.status === 'not_found') notFound();

    if (result.status === 'error') {
        return (
            <div className={S.page} dir="rtl">
                <div className={S.narrow}>
                    <section className={S.section}>
                        <SupportServerRetry message="تعذّر تحميل المقالة حالياً. قد تكون غير منشورة أو حدث خطأ مؤقت." />
                    </section>
                </div>
            </div>
        );
    }

    const article = result.article;
    // CSP is nonce-based: the structured-data block must carry the request nonce
    // (same pattern as the root layout / legacy FAQ page).
    const nonce = (await headers()).get('x-nonce') ?? undefined;

    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.titleAr,
        description: article.summaryAr ?? undefined,
        inLanguage: 'ar',
        datePublished: article.publishedAt ?? article.updatedAt,
        dateModified: article.updatedAt,
        mainEntityOfPage: canonicalUrlFor(slug),
        author: { '@type': 'Organization', name: SITE.name },
        publisher: { '@type': 'Organization', name: SITE.name },
    };

    return (
        <div className={S.page} dir="rtl">
            <div className={S.narrow}>
                <section className={S.section}>
                    <script
                        type="application/ld+json"
                        nonce={nonce}
                        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(articleSchema) }}
                    />
                    <ArticleDetail article={article} />
                </section>
            </div>
        </div>
    );
}
