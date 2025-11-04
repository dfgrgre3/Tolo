import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookies
  const accessToken = request.cookies.get('access_token')?.value;
  const authToken = request.cookies.get('auth_token')?.value;
  const hasToken = !!accessToken || !!authToken;

  // If user is authenticated and trying to access login/register, redirect
  // Note: We only check for token existence here, full verification happens on client-side
  // This prevents unnecessary redirects and keeps proxy fast
  if (hasToken && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    
    // Check if there's a redirect parameter, use it; otherwise go to home
    const redirectParam = url.searchParams.get('redirect');
    if (redirectParam) {
      try {
        const decodedRedirect = decodeURIComponent(redirectParam);
        // Validate that the redirect is a relative path (security measure)
        if (decodedRedirect.startsWith('/') && !decodedRedirect.startsWith('//')) {
          url.pathname = decodedRedirect.split('?')[0];
          url.search = decodedRedirect.includes('?') ? decodedRedirect.split('?')[1] : '';
          return NextResponse.redirect(url);
        }
      } catch (e) {
        // If decoding fails, fall back to home
        console.error('Failed to decode redirect parameter:', e);
      }
    }
    
    // Default redirect to home
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Continue with the request - custom i18n is handled in components
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

