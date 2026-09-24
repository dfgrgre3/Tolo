/**
 * React Query bindings for the Help Center.
 *
 * Every query spreads an explicit caching profile from
 * `@/lib/query/query-profiles` (project convention) and forwards React Query's
 * `AbortSignal` to the API client, so navigating away or changing a filter
 * cancels the in-flight request instead of letting it land on an unmounted
 * tree. Server-rendered pages pass their payload as `initialData`, which gives
 * an instant first paint and keeps the browser request as a *refresh* layer.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryProfiles } from '@/lib/query/query-profiles';
import {
    isSupportAuthFailure,
    isValidSupportId,
    sanitizeSupportSearchQuery,
} from '@/lib/support/validation';
import {
    supportService,
    type SupportArticleSummary,
    type SupportFaq,
    type SupportIncident,
    type SupportServiceStatus,
} from '@/services/api/support-service';

/** Minimum query length before the search endpoint is hit at all. */
export const SUPPORT_SEARCH_MIN_LENGTH = 2;

export const supportKeys = {
    all: ['support'] as const,
    popularArticles: () => ['support', 'articles', 'popular'] as const,
    article: (slug: string) => ['support', 'article', slug] as const,
    faqs: () => ['support', 'faqs'] as const,
    status: () => ['support', 'status'] as const,
    incidents: () => ['support', 'incidents'] as const,
    search: (query: string) => ['support', 'search', query] as const,
    myTickets: (status: string) => ['support', 'tickets', status || 'all'] as const,
    myTicket: (id: string) => ['support', 'ticket', id] as const,
} as const;

/**
 * The query profiles own caching semantics; only the retry predicate is
 * narrowed here: a 401 can never succeed on a retry, so it must fail fast and
 * let the UI switch to its "sign in" state.
 */
function retryUnlessUnauthorized(maxRetries: number) {
    return (failureCount: number, error: unknown) =>
        !isSupportAuthFailure(error) && failureCount < maxRetries;
}

type PopularArticlesData = { data: SupportArticleSummary[]; total: number };
type StatusData = { overall: string; services: SupportServiceStatus[] };

/** Most-read articles (static profile: published content, not user-specific). */
export function useSupportPopularArticles(initialData?: PopularArticlesData | null) {
    return useQuery({
        queryKey: supportKeys.popularArticles(),
        queryFn: ({ signal }) => supportService.listArticles({ sort: 'popular', limit: 6 }, { signal }),
        initialData: initialData ?? undefined,
        ...queryProfiles.static,
    });
}

/** Published FAQs. */
export function useSupportFaqs(initialData?: SupportFaq[] | null) {
    return useQuery({
        queryKey: supportKeys.faqs(),
        queryFn: ({ signal }) => supportService.listFaqs(undefined, { signal }),
        initialData: initialData ?? undefined,
        ...queryProfiles.static,
    });
}

/** Overall platform status — refreshed while the tab is open (incidents page). */
export function useSupportStatus(initialData?: StatusData | null) {
    return useQuery({
        queryKey: supportKeys.status(),
        queryFn: ({ signal }) => supportService.getStatus({ signal }),
        initialData: initialData ?? undefined,
        ...queryProfiles.dashboard,
    });
}

/** Public incident history. */
export function useSupportIncidents(initialData?: SupportIncident[] | null) {
    return useQuery({
        queryKey: supportKeys.incidents(),
        queryFn: ({ signal }) => supportService.listIncidents({ signal }),
        initialData: initialData ?? undefined,
        ...queryProfiles.dashboard,
    });
}

/**
 * Knowledge-base search across articles + FAQs.
 * Disabled below {@link SUPPORT_SEARCH_MIN_LENGTH} characters; previous results
 * are kept on screen while the next query resolves (no flicker, no spinner
 * churn).
 */
export function useSupportSearch(rawQuery: string) {
    const query = sanitizeSupportSearchQuery(rawQuery);
    return useQuery({
        queryKey: supportKeys.search(query),
        enabled: query.length >= SUPPORT_SEARCH_MIN_LENGTH,
        placeholderData: keepPreviousData,
        queryFn: async ({ signal }) => {
            const [articles, faqs] = await Promise.all([
                supportService.listArticles({ search: query, limit: 20 }, { signal }),
                supportService.listFaqs({ search: query }, { signal }),
            ]);
            return { articles: articles.data, faqs };
        },
        ...queryProfiles.static,
    });
}

/** The signed-in user's tickets (dashboard profile: fresh on every mount). */
export function useSupportMyTickets(status: string) {
    return useQuery({
        queryKey: supportKeys.myTickets(status),
        queryFn: ({ signal }) =>
            supportService.listMyTickets(
                { status: status || undefined, limit: 50 },
                { signal },
            ),
        ...queryProfiles.dashboard,
        retry: retryUnlessUnauthorized(1),
    });
}

/** A single ticket, disabled until the id passes validation. */
export function useSupportTicket(id: string, enabled = true) {
    return useQuery({
        queryKey: supportKeys.myTicket(id),
        queryFn: ({ signal }) => supportService.getMyTicket(id, { signal }),
        enabled: enabled && isValidSupportId(id),
        ...queryProfiles.dashboard,
        retry: retryUnlessUnauthorized(1),
    });
}
