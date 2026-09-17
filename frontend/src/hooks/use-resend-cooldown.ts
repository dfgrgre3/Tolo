"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCooldownRemaining,
  setCooldown,
  clearCooldown,
} from "@/lib/auth/rate-limit";

/**
 * useResendCooldown — countdown for "send again" buttons, backed by the
 * persistent cooldown store (`lib/auth/rate-limit.ts`).
 *
 * Unlike a bare `useState` counter, the deadline lives in localStorage, so
 * a reload mid-cooldown resumes where it left off instead of letting the
 * user fire another request immediately. The remaining time is recomputed
 * from `Date.now()` on every tick, so background-tab timer throttling only
 * delays the paint, never the deadline.
 *
 * The SERVER is the source of the wait: pass the backend-directed
 * `cooldownMs` (parsed from the 200 body or a 429) to `start()`; the
 * `fallbackMs` applies only when the server stated nothing.
 */
export function useResendCooldown(flowKey: string, fallbackMs = 60_000) {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    getCooldownRemaining(flowKey)
  );

  useEffect(() => {
    // Poll the store (deadlines are absolute timestamps, so a throttled
    // background tab only delays the paint, never the deadline itself).
    const timer = window.setInterval(() => {
      setRemainingMs(getCooldownRemaining(flowKey));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [flowKey]);

  const start = useCallback(
    (serverCooldownMs?: number | null) => {
      const wait =
        typeof serverCooldownMs === "number" &&
        Number.isFinite(serverCooldownMs) &&
        serverCooldownMs > 0
          ? Math.round(serverCooldownMs)
          : fallbackMs;
      setCooldown(flowKey, wait);
      setRemainingMs(getCooldownRemaining(flowKey));
    },
    [flowKey, fallbackMs]
  );

  const reset = useCallback(() => {
    clearCooldown(flowKey);
    setRemainingMs(0);
  }, [flowKey]);

  return {
    /** ms left; 0 = free to send. */
    remainingMs,
    /** Whole seconds left (ceil) for button labels. */
    remainingSeconds: Math.ceil(remainingMs / 1000),
    /** True while the button must stay disabled. */
    cooling: remainingMs > 0,
    start,
    reset,
  };
}
