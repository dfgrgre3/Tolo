import { describe, expect, it } from 'vitest';
import type {
  ApiResponse as FrontendApiResponse,
  ApiSuccessResponse as FrontendApiSuccessResponse,
} from '@/types/api/responses';
import { isApiResponse } from '@/types/api/responses';
import type {
  ApiResponse as SharedApiResponse,
  ApiSuccessResponse as SharedApiSuccessResponse,
} from '@thanawy/shared/types/api';
import { ApiContractError, ApiError as ClientApiError, unwrapApplicationPayload } from '@/lib/api/api-client';
import { ApiError as ResponseApiError } from '@/types/api/responses';
import { unwrapOpenApiPayload } from '@/lib/api/generated-client';

// Compile-time contract test: both import paths accept the same envelope.
const successResponse = {
  success: true,
  data: { id: 'course-1' },
  message: 'ok',
} satisfies SharedApiSuccessResponse<{ id: string }>;

const frontendSuccessResponse: FrontendApiSuccessResponse<{ id: string }> = successResponse;
const sharedResponse: SharedApiResponse<{ id: string }> = frontendSuccessResponse;
const frontendResponse: FrontendApiResponse<{ id: string }> = sharedResponse;
void frontendResponse;

describe('shared API response contract', () => {
  it('exposes the same runtime ApiError constructor everywhere', () => {
    const error = new ClientApiError('Unauthorized', 401);

    expect(ResponseApiError).toBe(ClientApiError);
    expect(error).toBeInstanceOf(ResponseApiError);
    expect(error.isUnauthorized).toBe(true);
    expect(error.isValidation).toBe(false);
  });

  it('preserves a serialized success response', () => {
    const parsed: unknown = JSON.parse(JSON.stringify(successResponse));

    expect(isApiResponse(parsed)).toBe(true);
    expect(parsed).toEqual(successResponse);
  });

  it('preserves a serialized error response', () => {
    const response = {
      success: false,
      error: 'Course not found',
      code: 'COURSE_NOT_FOUND',
      details: { courseId: 'course-1' },
      status: 404,
    } satisfies SharedApiResponse;
    const parsed: unknown = JSON.parse(JSON.stringify(response));

    expect(isApiResponse(parsed)).toBe(true);
    expect(parsed).toEqual(response);
  });

  it('makes the apiClient application-payload contract explicit', () => {
    expect(unwrapApplicationPayload<{ id: string }>({
      success: true,
      data: { id: 'course-1' },
    })).toEqual({ id: 'course-1' });
  });

  it('keeps the openapi-fetch boundary separate from apiClient', () => {
    const httpBody = { success: true, data: { items: [{ id: 'course-1' }] } };

    expect(unwrapOpenApiPayload<{ items: { id: string }[] }>(httpBody)).toEqual(httpBody.data);
    expect(unwrapOpenApiPayload<{ id: string }>({ id: 'course-1' })).toEqual({ id: 'course-1' });
  });

  it('rejects malformed envelopes instead of hiding contract errors', () => {
    expect(() => unwrapApplicationPayload({ success: true })).toThrow(ApiContractError);
    expect(() => unwrapApplicationPayload({ success: false, error: 'bad' })).toThrow(ApiContractError);
  });

  it.each([
    { success: true },
    { success: false },
    { success: true, data: undefined },
    { success: false, error: 'bad', details: [] },
    { success: false, error: 'bad', status: '404' },
  ])('rejects malformed envelope %#', (value) => {
    expect(isApiResponse(value)).toBe(false);
  });
});
