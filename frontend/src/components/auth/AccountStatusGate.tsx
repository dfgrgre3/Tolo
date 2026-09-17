"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/auth-context";

const BLOCKED_PATH = "/account-blocked";

/**
 * Redirects to a dedicated blocked-account screen whenever AuthStatus
 * resolves to "blocked" — a confirmed session whose account is not allowed
 * to authenticate (suspended/locked), which is NOT the same as "anonymous".
 * Without this, `blocked` is treated as an absent session everywhere else
 * (see redirect-loop-guard's SessionPresence mapping) and the visitor is
 * left on a broken/empty page with no explanation instead of a clear
 * account-status screen.
 */
export default function AccountStatusGate() {
  const { status } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "blocked" && pathname !== BLOCKED_PATH) {
      router.replace(BLOCKED_PATH);
    }
  }, [status, pathname, router]);

  return null;
}
