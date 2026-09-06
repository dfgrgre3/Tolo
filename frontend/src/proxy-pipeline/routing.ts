import { isGuestPage, isProtectedPage, isPublicApiPath } from '@/lib/security/policy/route-policy';

export { isGuestPage, isProtectedPage, isPublicApiPath };

export function isApiRequest(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export function isApiOrStaticPath(pathname: string): boolean {
  return pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');
}
