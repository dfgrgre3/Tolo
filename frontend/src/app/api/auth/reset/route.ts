import { NextResponse } from 'next/server';

// List of Clerk-related cookies that may carry stale data from a previous instance.
const CLERK_COOKIE_NAMES = [
  '__session',
  '__client_uat',
  '__clerk_db_jwt',
  '__dev_session',
  '__clerk_handshake',
  '__clerk_redirect_count',
];

/**
 * GET /api/auth/reset
 *
 * Clears all Clerk session cookies and redirects to the sign-in page.
 *
 * Useful in development when switching Clerk apps / publishable keys causes a
 * "jwk-kid-mismatch" error because the browser still holds an __session cookie
 * signed by the old Clerk instance's private key.
 *
 * Usage: open http://localhost:3000/api/auth/reset in your browser.
 */
export function GET(request: Request) {
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/login';
  const origin = new URL(request.url).origin;

  const response = NextResponse.redirect(new URL(signInUrl, origin));

  for (const name of CLERK_COOKIE_NAMES) {
    response.cookies.delete({ name, path: '/' });
  }

  return response;
}
