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
 *
 * Role vocabulary: every role set below is typed as `UserRole` (the shared
 * enum, via `@/lib/auth/roles`) — never bare `string`. String literals ARE
 * assignable to the enum type, so the lists read the same as before, but a
 * typo'd role (`"ADMN"`) now fails compilation instead of silently gating
 * wrong at the Edge. Incoming claims are normalized with `normalizeRole()`
 * (case-tolerant); unknown roles fail closed.
 */

import { UserRole, normalizeRole } from "@/lib/auth/roles";

// ─── Role sets ────────────────────────────────────────────────────────────────

/**
 * Any authenticated user may pass this gate — this is NOT student-specific.
 * (Previously named `ALLOWED_STUDENT_ROLES`, which misdescribed it: every
 * signed-in role is listed here, not just STUDENT.)
 */
export const ALLOWED_AUTHENTICATED_ROLES: readonly UserRole[] = [
  UserRole.STUDENT,
  UserRole.TEACHER,
  UserRole.PARENT,
  UserRole.SUPPORT,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
];

export const TEACHER_ENDPOINT_ROLES: readonly UserRole[] = [
  UserRole.TEACHER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];
export const STUDENT_ENDPOINT_ROLES: readonly UserRole[] = [
  UserRole.STUDENT,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

// ─── Path classification ─────────────────────────────────────────────────────

/**
 * Fully-private page sections (subtree match): every URL under these roots
 * requires a verified session at the Edge. Derived from the App Router
 * groups `(dashboard)` + sensitive `(education)/(community)` leaves:
 *   (dashboard): /dashboard /profile /settings /billing /subscription
 *     /tasks /schedule /goals /time /connections /academy /ai /analytics
 *     /leaderboard /jobs /all-features
 *   (education) user-scoped: /learning /exams /teacher-exams /cart
 *     /wishlist /library
 *   (misc): /mfa
 *
 * Public catalog stays OUT: /courses, /teachers, /resources,
 * /blog (read), /forum (read), /announcements (read), /events (read),
 * /contests (read) render without a session. Their write leaves are
 * pinned individually in PROTECTED_WRITE_PATHS below so a subtree grant
 * here can never accidentally open a public read surface, and a missing
 * entry here can never force a login on public browsing.
 */
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/billing",
  "/subscription",
  "/tasks",
  "/schedule",
  "/goals",
  "/time",
  "/connections",
  "/academy",
  "/ai",
  "/analytics",
  "/leaderboard",
  "/jobs",
  "/learning",
  "/exams",
  "/teacher-exams",
  "/cart",
  "/wishlist",
  "/library",
  "/chat",
  "/mfa",
  "/all-features",
] as const;

/**
 * Write leaves inside otherwise-public sections. Each entry is matched
 * with `matchesPath()` so `/forum/new-post` also covers a future
 * `/forum/new-post/...` without opening `/forum` itself.
 */
export const PROTECTED_WRITE_PATHS = [
  "/blog/new-post",
  "/forum/new-post",
  "/announcements/new",
  "/events/new",
  "/contests/new",
  "/chat/new",
] as const;

/** Edge-only guest routes used by the proxy's session gate. */
export const EDGE_GUEST_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/magic-link",
];

/**
 * Public API surface. Each entry declares its match mode explicitly so
 * adding a collection endpoint cannot silently open (or close) its
 * detail URLs:
 *   - `subtree`: the collection AND its detail/sub-paths are public
 *     (e.g. `/api/courses` + `/api/courses/123` + `/api/courses?page=2`).
 *   - `exact`: only the literal path is public; any sub-path stays
 *     protected (e.g. `/api/settings` is public but
 *     `/api/settings/private` is not).
 *
 * Safety invariants (enforced by `isPublicApiEndpoint` + tests):
 *   1. A `ROLE_RULES` hit always wins over public — e.g. `/api/courses`
 *      is a public subtree but `/api/courses/create` stays teacher-only.
 *   2. Known sensitive leaves are denied even under a public subtree —
 *      e.g. `/api/blog/admin` is never public even though `/api/blog/*`
 *      (post slugs) is.
 *   3. Matching is exact-or-subpath (`matchesPath`), never substring:
 *      `/api/settings-secret` is NOT `/api/settings`.
 */
export interface PublicApiRule {
  path: string;
  match: "exact" | "subtree";
}

export const PUBLIC_API_RULES: readonly PublicApiRule[] = [
  { path: "/api/categories", match: "subtree" },
  { path: "/api/teachers", match: "subtree" },
  { path: "/api/homepage", match: "exact" },
  { path: "/api/blog", match: "subtree" },
  { path: "/api/courses", match: "subtree" },
  { path: "/api/navigation/menu", match: "exact" },
  { path: "/api/settings", match: "exact" },
];

/**
 * Flat list of declared public roots. Kept for backward compatibility
 * (route-policy.ts re-exports it); prefer `PUBLIC_API_RULES` +
 * `isPublicApiEndpoint()` for classification.
 */
export const PUBLIC_API_ENDPOINTS: readonly string[] = PUBLIC_API_RULES.map(
  (rule) => rule.path,
);

/**
 * Sensitive leaves that are NEVER public, even when they sit under a
 * public `subtree` rule. Checked before the public rules so a future
 * `{ path: "/api/blog", match: "subtree" }`-style grant cannot
 * accidentally open an admin surface.
 */
const NEVER_PUBLIC_API_PATHS = [
  "/api/blog/admin",
  "/api/settings/private",
] as const;

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
  allowedRoles: readonly UserRole[];
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
  const clean = stripQueryFragment(pathname);
  return (
    [...PROTECTED_ROUTES, ...PROTECTED_WRITE_PATHS, "/admin"].some((route) =>
      matchesPath(clean, route),
    )
  );
}

export function isGuestRoute(pathname: string): boolean {
  return EDGE_GUEST_ROUTES.some((route) => matchesPath(pathname, route));
}

/**
 * Strips `?query` / `#fragment` so classification never depends on whether
 * the caller passed `request.nextUrl.pathname` (clean) or a raw URL string.
 */
export function stripQueryFragment(pathname: string): string {
  const cut = pathname.search(/[?#]/);
  return cut === -1 ? pathname : pathname.slice(0, cut);
}

export function isPublicApiEndpoint(pathname: string): boolean {
  const clean = stripQueryFragment(pathname);
  // 1. Role-gated endpoints are never public, even under a public subtree
  //    (e.g. `/api/courses/create` under public `/api/courses`).
  if (findRoleRule(clean) !== null) return false;
  // 2. Sensitive leaves are never public (e.g. `/api/blog/admin` under
  //    public `/api/blog`).
  if (NEVER_PUBLIC_API_PATHS.some((denied) => matchesPath(clean, denied))) {
    return false;
  }
  // 3. Otherwise apply the declared per-endpoint match mode.
  return PUBLIC_API_RULES.some((rule) =>
    rule.match === "exact" ? clean === rule.path : matchesPath(clean, rule.path),
  );
}

/**
 * Membership test for an Edge role gate. The incoming claim is normalized
 * (case-tolerant) before comparison, so a legitimately-issued lowercase
 * `"admin"` gates identically to `"ADMIN"`; unknown roles fail closed.
 */
export function hasRole(
  role: string | null | undefined,
  allowed: readonly UserRole[],
): boolean {
  const normalized = normalizeRole(role);
  return normalized !== null && allowed.includes(normalized);
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
