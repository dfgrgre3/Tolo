/**
 * Canonical Login Request & Response Contracts.
 * Mirrors Go backend: thanawy-backend/internal/application/dto/auth_dto.go (LoginRequest).
 */

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceName?: string;
  fingerprint?: string;
}

export type LoginRequestPayload = LoginRequest;

export interface LoginSuccessResponse {
  accessToken: string;
  user?: unknown;
}
