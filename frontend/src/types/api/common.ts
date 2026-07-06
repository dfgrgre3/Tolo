/**
 * Common API types — re-exported from responses.ts for backward compatibility.
 * Do NOT add new type definitions here; add them to responses.ts.
 */

export type DateString = string;
export type {
  ApiResponse,
  PaginatedMeta,
  PaginatedResponse,
  PaginationParams,
  SortParams,
  SearchParams,
  ApiError,
} from './responses';
