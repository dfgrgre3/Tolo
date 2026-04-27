/**
 * Common API response types
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

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ApiListData<T> {
    items: T[];
    pagination: PaginationMeta;
    [key: string]: unknown;
}

export interface PaginatedResponse<T> extends ApiSuccessResponse<ApiListData<T>> {
}
