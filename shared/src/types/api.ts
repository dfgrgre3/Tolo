/**
 * Common API types shared across all apps.
 */

export type DateString = string;

export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, unknown>;
    status?: number;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Backward-compatible name used by frontend consumers. */
export type PaginatedMeta = PaginationMeta;

/** Runtime guard for the discriminated API envelope. */
export function isApiResponse(value: unknown): value is ApiResponse {
    if (typeof value !== 'object' || value === null || !('success' in value)) {
        return false;
    }

    const response = value as Record<string, unknown>;
    if (response.success === true) {
        return 'data' in response && response.data !== undefined;
    }

    if (response.success !== false || typeof response.error !== 'string') {
        return false;
    }

    return (
        (response.code === undefined || typeof response.code === 'string') &&
        (response.status === undefined || typeof response.status === 'number') &&
        (response.details === undefined ||
            (typeof response.details === 'object' && response.details !== null && !Array.isArray(response.details)))
    );
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface SortParams {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams, SortParams {
    q?: string;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface ApiListData<T> {
    items: T[];
    pagination: PaginationMeta;
    [key: string]: unknown;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
    total?: number;
}
