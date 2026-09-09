/**
 * Login Service (OpenAPI variant) — POC for the migration to openapi-fetch.
 *
 * This file coexists with `login-service.ts` (the legacy `apiClient`-based
 * implementation) and is exported as `loginClient` / `verifyMfaClient` so
 * downstream code can opt in without breaking existing call sites. The
 * long-term plan is to delete `login-service.ts` once the OpenAPI variant
 * covers every endpoint and has equivalent test coverage.
 *
 * What changes vs. the legacy service:
 *   - `apiClient.post(apiRoutes.auth.login, payload)` becomes the typed
 *     `contractLogin(payload)` service call.
 *   - The response shape is type-checked against
 *     `packages/contracts/src/generated/api.ts` (regenerated from the
 *     backend swagger spec). Wrong paths or missing fields fail at build
 *     time instead of at runtime.
 *   - No more hand-maintained `apiRoutes` string table — the route paths
 *     live inside the generated types, derived from the same swagger spec
 *     the backend ships.
 *
 * Login and MFA operations are routed through the typed service boundary.
 */
import { z } from "zod";

import type { LoginOutcome, LoginCredentials } from "./login-service";
import { contractLogin, contractVerifyMfa } from "@/services/api/contracts-auth-service";

// ─── Runtime validators (mirror the shared canonical DTOs) ────────────────────

const loginRequestSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
  rememberMe: z.boolean(),
  deviceName: z.string(),
  fingerprint: z.string().optional(),
});

const mfaVerifyPayloadSchema = z.object({
  challengeId: z.string().trim().min(1),
  code: z.string().trim().min(1),
});

const loginChallengeSchema = z.object({
  mfaRequired: z.literal(true),
  challengeId: z.string().trim().min(1),
});

export function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown Device";
  return `${navigator.platform} (${navigator.language})`;
}

/**
 * Signs in with credentials. Never throws — inspect `success` / `requiresMfa`.
 *
 * On `requiresMfa: true` the session is NOT yet established; pass
 * `challengeId` to `verifyMfaClient` along with the user's code.
 */
export async function loginClient(
  credentials: LoginCredentials,
): Promise<LoginOutcome> {
  const payload = {
    email: credentials.email.trim(),
    password: credentials.password,
    rememberMe: credentials.rememberMe ?? false,
    deviceName: getDeviceName(),
    ...(credentials.fingerprint ? { fingerprint: credentials.fingerprint } : {}),
  };

  const parsed = loginRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      requiresMfa: false,
      challengeId: null,
      error: "بيانات الدخول غير صالحة",
    };
  }

  const { data, error, response } = await contractLogin(parsed.data);

  if (error || !response.ok) {
    return {
      success: false,
      requiresMfa: false,
      challengeId: null,
      error: extractError(error, "فشل تسجيل الدخول"),
    };
  }

  // MFA branch: parse the challenge response.
  const body = data as { mfaRequired?: unknown } | null;
  if (body?.mfaRequired === true) {
    const challenge = loginChallengeSchema.safeParse(body);
    if (!challenge.success) {
      return {
        success: false,
        requiresMfa: false,
        challengeId: null,
        error: "استجابة غير متوقعة من الخادم",
      };
    }
    return {
      success: false,
      requiresMfa: true,
      challengeId: challenge.data.challengeId,
    };
  }

  return { success: true, requiresMfa: false, challengeId: null };
}

/**
 * Completes an MFA challenge started by `loginClient`. Never throws.
 */
export async function verifyMfaClient(
  challengeId: string,
  code: string,
): Promise<LoginOutcome> {
  const payload = { challengeId, code: code.trim() };
  const parsed = mfaVerifyPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      requiresMfa: false,
      challengeId,
      error: "بيانات التحقق غير صالحة",
    };
  }

  const { error, response } = await contractVerifyMfa(parsed.data);

  if (error || !response.ok) {
    return {
      success: false,
      requiresMfa: false,
      challengeId,
      error: extractError(error, "فشل التحقق من الرمز"),
    };
  }

  return { success: true, requiresMfa: false, challengeId: null };
}

function extractError(
  err: unknown,
  fallback: string,
): string {
  if (err instanceof Error) return err.message;
  return fallback;
}
