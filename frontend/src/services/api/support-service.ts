/**
 * Support & Help Center API service.
 * Typed wrappers over the shared apiClient (cookie-authenticated, proxied
 * to the Go backend). No mock data — every function hits a real endpoint.
 */
import { apiClient } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import type { SupportRequestOptions } from '@/lib/support/contracts';

export interface SupportFaq {
    id: string;
    question: string;
    answer: string;
    category: string;
    displayOrder: number;
    isActive: boolean;
}

export interface SupportArticleSummary {
    id: string;
    slug: string;
    category: string;
    subcategory?: string;
    titleAr: string;
    titleEn?: string;
    summaryAr?: string;
    summaryEn?: string;
    tags?: string[];
    views: number;
    helpfulCount: number;
    notHelpfulCount: number;
    publishedAt?: string;
    updatedAt: string;
}

export interface SupportArticle extends SupportArticleSummary {
    contentAr: string;
    contentEn?: string;
}

export interface SupportTicketMessage {
    id: string;
    ticketId: string;
    senderId: string;
    senderName: string;
    senderRole: 'admin' | 'user' | 'system';
    message: string;
    isInternal: boolean;
    createdAt: string;
}

export interface SupportTicket {
    id: string;
    ticketNumber: string;
    userId: string;
    subject: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    tags?: string[];
    relatedEntityType?: string;
    relatedEntityId?: string;
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string | null;
    closedAt?: string | null;
    firstResponseAt?: string | null;
    firstResponseDueAt?: string | null;
    resolveDueAt?: string | null;
    slaStatus?: string;
    satisfactionRating?: number | null;
    messages?: SupportTicketMessage[];
}

export interface SupportServiceStatus {
    id: string;
    key: string;
    nameAr: string;
    nameEn?: string;
    status: string;
    mode?: string;
    detail?: string;
    checkedAt?: string;
}

export interface SupportIncidentUpdate {
    id: string;
    incidentId: string;
    status: string;
    messageAr: string;
    messageEn?: string;
    createdAt: string;
}

export interface SupportIncident {
    id: string;
    titleAr: string;
    titleEn?: string;
    status: string;
    isPublic: boolean;
    resolvedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    services?: SupportServiceStatus[];
    updates?: SupportIncidentUpdate[];
}

interface ListEnvelope<T> {
    items?: T[];
    tickets?: T[];
    total: number;
    limit?: number;
    offset?: number;
}

/**
 * Per-call transport controls for read endpoints.
 *
 *  - `signal`  — forwarded to fetch so React Query (or any caller) can cancel
 *    a superseded navigation/filter change instead of letting the response
 *    land on an unmounted tree.
 *  - `timeout` / `retries` — overridden by server-side loaders, which must fail
 *    fast (short timeout, no retries) so a slow backend can never stall SSR.
 *
 * Declared in `@/lib/support/contracts` (the support contract surface) and
 * re-exported here so both the service and the query hooks reference one type.
 */
export type { SupportRequestOptions };

function unwrapList<T>(payload: unknown, key: 'items' | 'tickets'): { data: T[]; total: number } {
    const p = payload as ListEnvelope<T> & Record<string, unknown>;
    const arr = (p[key] ?? p.items ?? []) as T[];
    return { data: Array.isArray(arr) ? arr : [], total: typeof p.total === 'number' ? p.total : arr.length };
}

export const supportService = {
    // ── Public Help Center ──────────────────────────────────────────
    async listFaqs(params?: { category?: string; search?: string }, options?: SupportRequestOptions): Promise<SupportFaq[]> {
        const q = new URLSearchParams();
        if (params?.category) q.set('category', params.category);
        if (params?.search) q.set('search', params.search);
        const suffix = q.toString() ? `?${q.toString()}` : '';
        const res = await apiClient.get<{ items: SupportFaq[]; total: number }>(`${apiRoutes.support.faqs}${suffix}`, options);
        return res.items ?? [];
    },

    async listArticles(params?: { category?: string; search?: string; sort?: string; limit?: number }, options?: SupportRequestOptions): Promise<{ data: SupportArticleSummary[]; total: number }> {
        const q = new URLSearchParams();
        if (params?.category) q.set('category', params.category);
        if (params?.search) q.set('search', params.search);
        if (params?.sort) q.set('sort', params.sort);
        q.set('limit', String(params?.limit ?? 20));
        const res = await apiClient.get<unknown>(`${apiRoutes.support.articles}?${q.toString()}`, options);
        return unwrapList<SupportArticleSummary>(res, 'items');
    },

    async getArticle(slug: string, options?: SupportRequestOptions): Promise<SupportArticle> {
        const res = await apiClient.get<{ article: SupportArticle }>(apiRoutes.support.article(slug), options);
        return res.article;
    },

    async voteArticle(slug: string, helpful: boolean, reason?: string): Promise<void> {
        await apiClient.postJson(apiRoutes.support.articleVote(slug), { helpful, reason });
    },

    async getStatus(options?: SupportRequestOptions): Promise<{ overall: string; services: SupportServiceStatus[] }> {
        return apiClient.get(apiRoutes.support.status, options);
    },

    async listIncidents(options?: SupportRequestOptions): Promise<SupportIncident[]> {
        const res = await apiClient.get<{ items: SupportIncident[]; total: number }>(apiRoutes.support.incidents, options);
        return res.items ?? [];
    },

    // ── My tickets (authenticated) ──────────────────────────────────
    async createTicket(input: {
        subject: string;
        description: string;
        categoryId?: string;
        priority?: string;
        relatedCourseId?: string;
        relatedOrderId?: string;
    }): Promise<SupportTicket> {
        // Wire contract (Go backend): lowercase `category` + `priority`.
        const body = {
            subject: input.subject,
            description: input.description,
            category: input.categoryId ?? 'other',
            priority: (input.priority ?? 'NORMAL').toLowerCase(),
            relatedEntityType: input.relatedCourseId ? 'course' : undefined,
            relatedEntityId: input.relatedCourseId ?? input.relatedOrderId,
        };
        const res = await apiClient.postJson<{ ticket: SupportTicket }>(apiRoutes.support.myTickets, body);
        return res.ticket;
    },

    async listMyTickets(params?: { status?: string; search?: string; limit?: number; offset?: number }, options?: SupportRequestOptions): Promise<{ data: SupportTicket[]; total: number }> {
        const q = new URLSearchParams();
        if (params?.status) q.set('status', params.status);
        if (params?.search) q.set('search', params.search);
        q.set('limit', String(params?.limit ?? 20));
        q.set('offset', String(params?.offset ?? 0));
        const res = await apiClient.get<unknown>(`${apiRoutes.support.myTickets}?${q.toString()}`, options);
        return unwrapList<SupportTicket>(res, 'tickets');
    },

    async getMyTicket(id: string, options?: SupportRequestOptions): Promise<SupportTicket> {
        const res = await apiClient.get<{ ticket: SupportTicket }>(apiRoutes.support.myTicket(id), options);
        return res.ticket;
    },

    async replyToTicket(id: string, input: { body: string }): Promise<SupportTicketMessage> {
        const res = await apiClient.postJson<{ ticketMessage: SupportTicketMessage }>(apiRoutes.support.myTicketMessages(id), { message: input.body });
        return res.ticketMessage;
    },

    async closeTicket(id: string): Promise<void> {
        await apiClient.postJson(apiRoutes.support.myTicketClose(id), {});
    },

    async reopenTicket(id: string): Promise<void> {
        await apiClient.postJson(apiRoutes.support.myTicketReopen(id), {});
    },

    async rateTicket(id: string, input: { score: number; comment?: string }): Promise<void> {
        await apiClient.postJson(apiRoutes.support.myTicketRating(id), { score: input.score, comment: input.comment });
    },
};
