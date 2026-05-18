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

async function verifyAdminSession(request: NextRequest): Promise<{ isAuthenticated: boolean; isAdmin: boolean }> {
  const url = new URL('/api/auth/me', request.url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
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

export async function middleware(request: NextRequest) {
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
