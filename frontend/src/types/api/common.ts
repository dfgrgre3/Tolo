/**
 * Common API types — re-exported from responses.ts for backward compatibility.
 * Do NOT add new type definitions here; add them to responses.ts.
 */

export type DateString = string;
export { ApiError, isApiResponse } from './responses';
export type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  PaginatedMeta,
  PaginatedResponse,
  PaginationMeta,
  PaginationParams,
  SortParams,
  SearchParams,
} from './responses';
