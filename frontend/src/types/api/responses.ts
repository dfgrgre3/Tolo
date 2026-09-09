/** Frontend API types are re-exported from the shared contract. */
export { ApiError } from '@/lib/api/api-client';
export { isApiResponse } from '@thanawy/shared/types/api';
export type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  DateString,
  PaginatedMeta,
  PaginatedResponse,
  PaginationMeta,
  PaginationParams,
  SearchParams,
  SortParams,
} from '@thanawy/shared/types/api';
