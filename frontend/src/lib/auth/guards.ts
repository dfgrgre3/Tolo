import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserRole, ClerkSessionClaims, resolveClerkRole, isAdminRole } from './roles';
import { hasPermission } from './authorization';
import { Permission } from './permissions';

/**
 * Ensures the current request is authenticated.
 * Redirects to /login if not.
 * @returns The authenticated Clerk userId.
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    redirect('/login');
  }
  return userId;
}

/**
 * Ensures the current request is authenticated AND has one of the specified roles.
 * Redirects to /login if not authenticated, /unauthorized if role check fails.
 * @param roles - Allowed roles for this resource.
 * @returns The authenticated userId and resolved role.
 */
export async function requireRole(roles: UserRole[]): Promise<{ userId: string; role: UserRole }> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/login');
  }

  const role = resolveClerkRole(sessionClaims as ClerkSessionClaims);

  if (!role || !roles.includes(role)) {
    redirect('/unauthorized');
  }

  return { userId, role };
}

/**
 * Ensures the current request is an admin (SUPER_ADMIN, ADMIN, or MODERATOR).
 * Redirects to /unauthorized if the role check fails.
 * @returns The authenticated userId and resolved role.
 */
export async function requireAdmin(): Promise<{ userId: string; role: UserRole }> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/login');
  }

  const role = resolveClerkRole(sessionClaims as ClerkSessionClaims);

  if (!role || !isAdminRole(role)) {
    redirect('/unauthorized');
  }

  return { userId, role };
}

/**
 * Gets the current auth state without redirecting.
 * Returns null if not authenticated. Useful for optional auth checks.
 */
export async function getOptionalAuth(): Promise<{
  userId: string;
  role: UserRole | null;
} | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) return null;

  const role = resolveClerkRole(sessionClaims as ClerkSessionClaims);
  return { userId, role };
}

/**
 * Assert-style server-side guard to require a specific permission.
 * Redirects to /unauthorized if not authorized or /login if unauthenticated.
 */
export async function requirePermission(permission: Permission | string): Promise<{ userId: string; role: UserRole }> {
  const authState = await getOptionalAuth();
  if (!authState) {
    redirect('/login');
  }

  const { userId, role } = authState;
  
  // Lazily load getAuthUser to avoid circular imports during startup
  const { getAuthUser } = await import('./auth');
  const user = await getAuthUser();

  if (!user || !hasPermission(user, permission)) {
    redirect('/unauthorized');
  }

  return { userId, role: role || 'STUDENT' };
}

