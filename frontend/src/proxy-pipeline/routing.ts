import { NextResponse } from 'next/server';
import { findRoleRule, hasRole } from '@/lib/auth/route-guards';
import { isGuestPage, isProtectedPage, isPublicApiPath } from '@/lib/security/policy/route-policy';

export { isGuestPage, isProtectedPage, isPublicApiPath };

export function isApiRequest(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export function isApiOrStaticPath(pathname: string): boolean {
  return pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');
}

/**
 * Coarse role gate for endpoints declared in ROLE_RULES (e.g. teacher-only,
 * student-only). This is a fast-path running at proxy level — the backend re-validates
 * roles on every request and remains the authority.
 *
 * Returns a 403 NextResponse if denied, or null if allowed/inapplicable.
 */
export function applyRoleGate(
  pathname: string,
  userRole?: string | null,
  isPublic = false,
): NextResponse | null {
  if (!isApiRequest(pathname) || isPublic) {
    return null;
  }
  const roleRule = findRoleRule(pathname);
  if (roleRule && !hasRole(userRole, roleRule.allowedRoles)) {
    return NextResponse.json({ error: roleRule.errorMessage }, { status: 403 });
  }
  return null;
}
