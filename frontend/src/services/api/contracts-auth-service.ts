/**
 * Typed service boundary for endpoints present in @thanawy/contracts.
 *
 * Keep generated-client calls here so feature services do not mix OpenAPI
 * operations with the legacy apiClient envelope.
 */
import { client, type components } from '@/lib/api/generated-client';

export type ContractLoginRequest = components['schemas']['thanawy-backend_internal_application_dto.LoginRequest'];

export function contractLogin(payload: ContractLoginRequest) {
  return client.POST('/api/v1/auth/login', { body: payload });
}

export function contractVerifyMfa(payload: { challengeId: string; code: string }) {
  return client.POST('/api/v1/auth/mfa/verify', { body: payload });
}
