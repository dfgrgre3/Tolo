/**
 * Server-only loaders for the public Help Center (home, FAQ, status, articles).
 *
 * Design constraints:
 *  - NEVER break a page: every loader swallows failures and returns `null`
 *    (or a typed status) so the client hook can retry from the browser
 *    instead of the server rendering a 500 for a public page.
 *  - Request-scoped de-duplication: `cache()` guarantees `generateMetadata`
 *    and the page body (and any nested server call) hit the backend once per
 *    request.
 *  - Bounded latency: a short timeout with zero retries keeps SSR fast; the
 *    client query layer is responsible for freshness/retries.
 *  - Authenticated ticket data is deliberately NOT loaded here: it stays
 *    client-side (cookie-authenticated proxy) and is never cached server-side.
 */
import 'server-only';
import { cache } from 'react';
import { isNotFoundError } from '@/lib/errors/domain-errors';
import { supportService, type SupportArticle } from '@/services/api/support-service';
import { isValidSupportSlug } from './validation';

/** Keep SSR fast: bail out quickly and let the client query try instead. */
const SERVER_FETCH_OPTIONS = { timeout: 4_000, retries: 0 } as const;

/** Popular articles for the Help Center home (server-rendered for SEO/LCP). */
export const loadSupportPopularArticles = cache(async () => {
    try {
        return await supportService.listArticles({ sort: 'popular', limit: 6 }, SERVER_FETCH_OPTIONS);
    } catch {
        return null;
    }
});

/** Published FAQ entries (server-rendered + used for FAQPage structured data). */
export const loadSupportFaqs = cache(async () => {
    try {
        return await supportService.listFaqs(undefined, SERVER_FETCH_OPTIONS);
    } catch {
        return null;
    }
});

/** Overall platform status (services + their current state). */
export const loadSupportStatus = cache(async () => {
    try {
        return await supportService.getStatus(SERVER_FETCH_OPTIONS);
    } catch {
        return null;
    }
});

/** Public incident history. */
export const loadSupportIncidents = cache(async () => {
    try {
        return await supportService.listIncidents(SERVER_FETCH_OPTIONS);
    } catch {
        return null;
    }
});

export type SupportArticleLoadResult =
    | { status: 'ok'; article: SupportArticle }
    | { status: 'not_found' }
    | { status: 'error' };

/**
 * Single article, distinguishing "missing" (404 -> `notFound()`) from a
 * transient failure (keep the page alive and let the client retry).
 */
export const loadSupportArticle = cache(async (slug: string): Promise<SupportArticleLoadResult> => {
    if (!isValidSupportSlug(slug)) return { status: 'not_found' };
    try {
        const article = await supportService.getArticle(slug, SERVER_FETCH_OPTIONS);
        return article ? { status: 'ok', article } : { status: 'error' };
    } catch (error) {
        return isNotFoundError(error) ? { status: 'not_found' } : { status: 'error' };
    }
});

/** Server-rendered payload for the Help Center landing page. */
export const loadSupportHomeData = cache(async () => {
    const [popular, status] = await Promise.all([
        loadSupportPopularArticles(),
        loadSupportStatus(),
    ]);
    return { popular, status };
});
