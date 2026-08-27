"use client";

import { useState, useEffect, memo } from "react";
import { safeFetch } from "@/lib/safe-client-utils";
import { Trophy } from "lucide-react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/use-auth";
import { DashSection, DashEmpty } from "../../shared/SectionShell";
import { LeaderboardCard } from "./LeaderboardCard";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  badge?: string;
  isCurrentUser?: boolean;
}

/** Noon-style flat panel hosting the XP leaderboard. */
export const SocialFeaturesSection = memo(function SocialFeaturesSection() {
  const { user, isAuthenticated } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = isAuthenticated && user?.id ? user.id : null;
    let cancelled = false;
    setLoading(true);
    setLeaderboard([]);

    const fetchData = async () => {
      try {
        // Fetch leaderboard
        const { data: leaderData, error: leaderError } = await safeFetch<{
          leaderboard: Array<{rank: number;userId: string;name: string;totalXP: number;level: number;}>;
          userPosition?: {rank: number;totalXP: number;level: number;};
        }>(
          `/api/gamification/leaderboard?limit=5${userId ? `&userId=${userId}` : ''}`,
          undefined,
          null
        );
        if (cancelled) return;

        const leaderSrc = (leaderData as { data?: typeof leaderData } | null)?.data ?? leaderData;
        if (!cancelled && !leaderError && leaderSrc?.leaderboard) {
          const transformedLeaderboard: LeaderboardEntry[] = leaderSrc.leaderboard.map((entry, index) => ({
            rank: entry.rank || index + 1,
            name: entry.name || "مستخدم",
            score: entry.totalXP || 0,
            badge: entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "⭐",
            isCurrentUser: entry.userId === userId
          }));

          setLeaderboard(transformedLeaderboard);
        } else {
          setLeaderboard([]);
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Error fetching social data:", error);
          setLeaderboard([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAuthenticated]);

  return (
    <DashSection
      title="لوحة المتصدرين"
      subtitle="ترتيب أعلى الطلاب في نقاط الخبرة"
      icon={Trophy}
    >
      {!loading && leaderboard.length === 0 ? (
        <DashEmpty
          icon={Trophy}
          title="لوحة المتصدرين فارغة"
          description="اكسب نقاط خبرة لتظهر في الترتيب"
        />
      ) : (
        <LeaderboardCard loading={loading} leaderboard={leaderboard} />
      )}
    </DashSection>
  );
});

export default SocialFeaturesSection;
