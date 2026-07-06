/**
 * Shared API response types — mirrors the backend ApiResponse envelope.
 * All backend handlers return { success, data, message, error, code }.
 */

// ────────────────────────────────────────────────────────────
// Core API Envelope (matches backend response.go)
// ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
  /** legacy field — some handlers return total at root */
  total?: number;
}

// ────────────────────────────────────────────────────────────
// API Error
// ────────────────────────────────────────────────────────────

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

  /** True when the server returned HTTP 401 */
  get isUnauthorized(): boolean { return this.status === 401; }
  /** True when the server returned HTTP 403 */
  get isForbidden(): boolean { return this.status === 403; }
  /** True when the server returned HTTP 404 */
  get isNotFound(): boolean { return this.status === 404; }
  /** True when the server returned HTTP 422 */
  get isValidation(): boolean { return this.status === 422; }
  /** True when the server returned HTTP 429 */
  get isRateLimited(): boolean { return this.status === 429; }
}

// ────────────────────────────────────────────────────────────
// Query helpers
// ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams, SortParams {
  q?: string;
}
