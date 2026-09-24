"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Client-side redirect from /teach to /teaching
// This avoids the RSC payload fetch error that occurs with server-side redirects
// when Next.js tries to prefetch /teach before the redirect happens.
export default function TeachRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Small delay to ensure the router is ready
    const timeout = setTimeout(() => {
      router.replace("/teaching");
    }, 0);
    return () => clearTimeout(timeout);
  }, [router]);

  // Show nothing while redirecting (can add a loading indicator if needed)
  return null;
}