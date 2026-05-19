import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATH_PREFIX = '/admin';
const ADMIN_LOGIN_PATH = '/admin-login';
const PROTECTED_API_PREFIX = '/api/admin';

const PUBLIC_ADMIN_PATHS = [ADMIN_LOGIN_PATH];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);
}

function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith(PROTECTED_API_PREFIX);
}

const BACKEND_URL = (() => {
  const url = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8082'
  ).replace(/\/api$/, '');
  
  if (!url.startsWith('http')) {
    return `http://${url}`;
  }
  return url;
})();

async function verifyAdminSession(request: NextRequest): Promise<{ isAuthenticated: boolean; isAdmin: boolean }> {
  const targetUrl = `${BACKEND_URL}/api/auth/me`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
        Authorization: request.headers.get('authorization') || '',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { isAuthenticated: false, isAdmin: false };
    }

    const data = await response.json();
    const user = data?.user;
    
    if (!user) {
      return { isAuthenticated: false, isAdmin: false };
    }

    const role = user.role?.toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

    return { isAuthenticated: true, isAdmin };
  } catch {
    return { isAuthenticated: false, isAdmin: false };
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isProtectedPage = isAdminPath(pathname);
  const isProtectedApi = isAdminApiPath(pathname);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const session = await verifyAdminSession(request);

  if (!session.isAuthenticated) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session.isAdmin) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
