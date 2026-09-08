import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

/** Keeps learner identity formatting in one player-owned hook. */
export function usePlayerWatermark(fallback: string) {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) return fallback;
    return `${user.name || user.username} | ${user.phone || "Verified"} | ${new Date().toLocaleDateString("ar-EG")}`;
  }, [fallback, user]);
}
