/**
 * Common API response types
 */

export type DateString = string;

interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
}

interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, unknown>;
    status?: number;
}

type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface ApiListData<T> {
    items: T[];
    pagination: PaginationMeta;
    [key: string]: unknown;
}

interface PaginatedResponse<T> extends ApiSuccessResponse<ApiListData<T>> {
}
