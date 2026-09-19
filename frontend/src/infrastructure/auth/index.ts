/**
 * Infrastructure Layer — Auth (Edge & Server)
 *
 * البنية التحتية للمصادقة على مستوى Edge/Server:
 * jwt-edge، route-guards، session-verification.
 *
 * ملاحظة: هذا مختلف عن `features/auth` الذي يمتلك
 * منطق الأعمال وحالة المصادقة في الـ Client.
 * هذه الطبقة تختص بالـ middleware وchecks على السيرفر.
 *
 * @canonical `@/infrastructure/auth`
 */

// JWT Edge verification
export {
  verifyAccessToken,
  attemptTokenRefresh,
} from "@/lib/auth/jwt-edge";
export type { AccessTokenPayload } from "@/lib/auth/jwt-edge";

// Route guards (middleware-level)
export { applyRoleGate } from "@/proxy-pipeline/routing";
