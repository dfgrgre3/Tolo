/**
 * Canonical MFA Challenge & Verify Contracts.
 * Mirrors Go backend: thanawy-backend/internal/application/dto/auth_dto.go (VerifyMFARequest).
 */

export interface MfaChallenge {
  challengeId: string;
}

export interface MfaVerifyRequest {
  challengeId: string;
  code: string;
}

export type MfaVerifyPayload = MfaVerifyRequest;

export interface LoginChallengeResponse {
  mfaRequired: true;
  challengeId: string;
}

export type LoginResponseBody = LoginChallengeResponse | import("./login").LoginSuccessResponse;
