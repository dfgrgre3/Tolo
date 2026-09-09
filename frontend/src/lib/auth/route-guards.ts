/**
 * Route/role tables used by the Edge middleware (`src/proxy.ts`) to decide,
 * before the request reaches the Go backend, whether a path needs a session
 * and which roles may reach it. The backend remains the authority for actual
 * authorization — these guards only save a round trip for the common case.
 *
 * Two-tier security model
 * -----------------------
 * The Edge layer performs coarse gating based on JWT claims (signed token,
 * role field). Anything more nuanced — suspended accounts, ownership,
 * entitlement, fine-grained action permissions — is the backend's job. If
 * a check here disagrees with the backend, the backend wins. These tables
 * exist to make the common case fast and to keep obviously-forbidden
 * traffic from reaching the upstream at all.
 *
 * Single source of truth
 * ----------------------
 * Every endpoint that requires a specific role set is declared in
 * `ROLE_RULES` below. The proxy middleware reads this table instead of
 * hand-rolling `matchesPath(...) || matchesPath(...)` blocks. To add a
 * new role-gated endpoint, append one entry here — no proxy change needed.
 */

// ─── Role sets ────────────────────────────────────────────────────────────────

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

export const TEACHER_ENDPOINT_ROLES = ["TEACHER", "ADMIN", "SUPER_ADMIN"] as const;
export const STUDENT_ENDPOINT_ROLES = ["STUDENT", "ADMIN", "SUPER_ADMIN"] as const;

// ─── Path classification ─────────────────────────────────────────────────────

const PROTECTED_ROUTES = ["/dashboard", "/learning", "/profile"];

/** Edge-only guest routes used by the proxy's session gate. */
export const EDGE_GUEST_ROUTES = [
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

// ─── Coarse role gating table ────────────────────────────────────────────────

/**
 * Declarative role-gating rules for endpoints that need more than the
 * generic "any authenticated user" check.
 *
 * Each entry is `{ path, allowedRoles, errorMessage }`:
 *   - `path` is matched via `matchesPath()` (exact-or-sub-path, never
 *     substring-blind) so `/api/teaching` does not capture
 *     `/api/teaching-history` and `/api/courses/create` does not capture
 *     `/api/courses/create-bulk`.
 *   - `allowedRoles` is the allow-list read by `hasRole()`. A request
 *     whose JWT role is not in this list is rejected at the Edge with
 *     `403`. The backend still re-validates — Edge rejection is purely
 *     a coarse fast-path.
 *   - `errorMessage` is the human-readable string returned to the client
 *     (used by `findRoleRule()` to build a consistent 403 body).
 *
 * The proxy middleware iterates this table once per request. Order is
 * irrelevant — first match wins and rules are non-overlapping by
 * construction (paths do not share a prefix with sibling entries).
 */
export interface RoleRule {
  path: string;
  allowedRoles: readonly string[];
  errorMessage: string;
  match: "exact" | "subtree";
}

export const ROLE_RULES: readonly RoleRule[] = [
  {
    path: "/api/teaching",
    allowedRoles: TEACHER_ENDPOINT_ROLES,
    errorMessage: "Access Denied: Teacher privileges required",
    match: "subtree",
  },
  {
    path: "/api/courses/create",
    allowedRoles: TEACHER_ENDPOINT_ROLES,
    errorMessage: "Access Denied: Teacher privileges required",
    match: "exact",
  },
  {
    path: "/api/student",
    allowedRoles: STUDENT_ENDPOINT_ROLES,
    errorMessage: "Access Denied: Student access required",
    match: "subtree",
  },
  {
    path: "/api/exams/submit",
    allowedRoles: STUDENT_ENDPOINT_ROLES,
    errorMessage: "Access Denied: Student access required",
    match: "exact",
  },
];

// ─── Path matchers ────────────────────────────────────────────────────────────

/**
 * Exact-or-subpath path matcher. `/profile` matches `/profile` and `/profile/123`
 * but NOT `/profiled` or `/profile-settings` — plain `startsWith` would treat
 * those as the protected route itself.
 */
export function matchesPath(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isAdminRoute(pathname: string): boolean {
  return matchesPath(pathname, "/admin");
}

export function isProtectedRoute(pathname: string): boolean {
  return [...PROTECTED_ROUTES, "/admin"].some((route) => matchesPath(pathname, route));
}

export function isGuestRoute(pathname: string): boolean {
  return EDGE_GUEST_ROUTES.some((route) => matchesPath(pathname, route));
}

export function isPublicApiEndpoint(pathname: string): boolean {
  return PUBLIC_API_ENDPOINTS.includes(pathname);
}

export function hasRole(role: string | null | undefined, allowed: readonly string[]): boolean {
  return !!role && allowed.includes(role);
}

// ─── Role-rule lookup ────────────────────────────────────────────────────────

/**
 * Resolves the first `ROLE_RULES` entry whose `path` matches `pathname`.
 * Returns `null` when no role-specific gate applies — in that case the
 * caller should fall through to the generic "any authenticated role"
 * check using `ALLOWED_AUTHENTICATED_ROLES`.
 *
 * The lookup uses `matchesPath()` for consistency with the rest of the
 * file; a future change to the matcher (e.g. wildcard segments) will
 * automatically be picked up here without a parallel implementation.
 */
export function findRoleRule(pathname: string): RoleRule | null {
  for (const rule of ROLE_RULES) {
    if (rule.match === "exact" ? pathname === rule.path : matchesPath(pathname, rule.path)) {
      return rule;
    }
  }
  return null;
}
