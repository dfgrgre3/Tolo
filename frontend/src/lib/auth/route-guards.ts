/**
 * Route/role tables used by the Edge middleware (`src/proxy.ts`) to decide,
 * before the request reaches the Go backend, whether a path needs a session
 * and which roles may reach it. The backend remains the authority for actual
 * authorization — these guards only save a round trip for the common case.
 */

/**
 * Any authenticated user may pass this gate — this is NOT student-specific.
 * (Previously named `ALLOWED_STUDENT_ROLES`, which misdescribed it: every
 * signed-in role is listed here, not just STUDENT.)
 */
export const ALLOWED_AUTHENTICATED_ROLES = [
  "STUDENT",
  "TEACHER",
  "PARENT",
  "SUPPORT",
  "ADMIN",
  "SUPER_ADMIN",
  "MODERATOR",
] as const;

export const ADMIN_PANEL_ROLES = ["ADMIN", "SUPER_ADMIN", "MODERATOR"] as const;
export const TEACHER_ENDPOINT_ROLES = ["TEACHER", "ADMIN", "SUPER_ADMIN"] as const;
export const STUDENT_ENDPOINT_ROLES = ["STUDENT", "ADMIN", "SUPER_ADMIN"] as const;

const PROTECTED_ROUTES = ["/dashboard", "/settings", "/profile", "/learning"];

const GUEST_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/admin-login",
  "/mfa",
];

/** Endpoints that don't require authentication even under the general API gate. */
const PUBLIC_API_ENDPOINTS = [
  "/api/categories",
  "/api/teachers",
  "/api/homepage",
  "/api/blog",
  "/api/navigation/menu",
  "/api/settings",
];

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin/");
}

export function isProtectedRoute(pathname: string): boolean {
  return [...PROTECTED_ROUTES, "/admin/"].some((route) => pathname.startsWith(route));
}

export function isGuestRoute(pathname: string): boolean {
  return GUEST_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isPublicApiEndpoint(pathname: string): boolean {
  return PUBLIC_API_ENDPOINTS.some((endpoint) => pathname.startsWith(endpoint));
}

export function hasRole(role: string | null | undefined, allowed: readonly string[]): boolean {
  return !!role && allowed.includes(role);
}
