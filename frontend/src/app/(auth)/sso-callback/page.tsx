'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { m } from 'framer-motion';

/**
 * SSO Callback Page
 *
 * Handles the OAuth redirect after social login (Google, GitHub, Apple, etc.).
 * Clerk automatically completes the sign-in by calling handleRedirectCallback(),
 * which reads the Clerk state from the URL hash/params and activates the session.
 *
 * The user is then redirected to /dashboard (or the ?redirect_url param).
 */
export default function SSOCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect_url') || '/dashboard';

    handleRedirectCallback({
      signInForceRedirectUrl: redirectUrl,
      signUpForceRedirectUrl: redirectUrl,
    }).catch((err) => {
      // If the callback fails (e.g., user cancelled, token expired), send to login
      console.error('[SSO Callback] handleRedirectCallback failed:', err);
      router.replace('/login?error=oauth_failed');
    });
  }, [handleRedirectCallback, router]);

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center bg-[#020202]"
      dir="rtl"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-6 text-center"
      >
        {/* Spinner */}
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-primary/10 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-bold text-white">جاري إتمام تسجيل الدخول...</p>
          <p className="text-sm text-white/40">يتم التحقق من هويتك بأمان</p>
        </div>
      </m.div>
    </div>
  );
}
