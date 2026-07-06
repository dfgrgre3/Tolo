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
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
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

export class ApiError extends Error {
    public readonly status: number;
    public readonly code?: string;
    public readonly data?: Record<string, unknown>;

    constructor(
        message: string,
        status: number,
        code?: string,
        data?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.data = data;
    }

    get isUnauthorized(): boolean { return this.status === 401; }
    get isForbidden(): boolean { return this.status === 403; }
    get isNotFound(): boolean { return this.status === 404; }
    get isValidation(): boolean { return this.status === 422; }
    get isRateLimited(): boolean { return this.status === 429; }
}
