/**
 * /login/tasks — Clerk Pending Tasks Fallback
 *
 * Clerk may redirect here when a session has pending tasks
 * (e.g., choose-organization, setup-mfa) that aren't configured via taskUrls.
 *
 * We redirect immediately to /dashboard and let the application
 * handle any incomplete flows from there.
 */
import { redirect } from 'next/navigation';

export default async function LoginTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  // Honor the redirect_url if it points to a safe internal path
  const resolvedSearchParams = await searchParams;
  const redirectUrl = resolvedSearchParams.redirect_url;
  let destination = '/dashboard';

  if (redirectUrl) {
    try {
      const url = new URL(redirectUrl);
      // Only allow same-origin redirects for security
      if (url.origin === 'http://localhost:3000' || url.hostname === process.env.NEXT_PUBLIC_BASE_URL?.replace(/https?:\/\//, '')) {
        destination = url.pathname + url.search;
      }
    } catch {
      // Invalid URL — fall back to /dashboard
    }
  }

  redirect(destination);
}
