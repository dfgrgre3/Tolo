"use client";

import { useState, useEffect, memo } from "react";
import { safeFetch } from "@/lib/safe-client-utils";
import { Users, Award } from "lucide-react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/use-auth";
import { rpgCommonStyles } from "../../shared/styles";
import { LeaderboardCard } from "./LeaderboardCard";
import { RecentAchievementsCard } from "./RecentAchievementsCard";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  badge?: string;
  isCurrentUser?: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlockedAt?: Date;
  progress?: number;
  total?: number;
}

export const SocialFeaturesSection = memo(function SocialFeaturesSection() {
  const { user, isAuthenticated } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = isAuthenticated && user?.id ? user.id : null;
    let cancelled = false;
    setLoading(true);
    setLeaderboard([]);
    setRecentAchievements([]);

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

        // Fetch achievements
        const { data: achievementsData, error: achievementsError } = await safeFetch<{
          achievements: Array<{
            id: string;
            title: string;
            description: string;
            progress?: number;
            total?: number;
            unlockedAt?: string;
          }>;
        }>(
          `/api/gamification/achievements${userId ? `?userId=${userId}` : ''}`,
          undefined,
          null
        );
        if (cancelled) return;

        const achievementsSrc = (achievementsData as { data?: typeof achievementsData } | null)?.data ?? achievementsData;
        if (!achievementsError && achievementsSrc?.achievements) {
          const transformedAchievements: Achievement[] = achievementsSrc.achievements.slice(0, 3).map((ach) => ({
            id: ach.id,
            title: ach.title,
            description: ach.description,
            icon: <Award className="h-6 w-6" />,
            unlockedAt: ach.unlockedAt ? new Date(ach.unlockedAt) : undefined,
            progress: ach.progress,
            total: ach.total
          }));

          setRecentAchievements(transformedAchievements);
        } else {
          setRecentAchievements([]);
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Error fetching social data:", error);
          setLeaderboard([]);
          setRecentAchievements([]);
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
    <section className={`${rpgCommonStyles.glassPanel} px-6 md:px-12 py-12 shadow-2xl`}>
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10" />

      <div className="relative z-10">
        <div
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-full bg-gradient-to-r from-yellow-600 to-orange-600 p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className={`text-3xl md:text-4xl font-black ${rpgCommonStyles.goldText}`}>
              المتصدرون وإنجازاتك
            </h2>
          </div>
          <p className="text-gray-400 text-lg">
            ترتيب أعلى الطلاب في نقاط الخبرة، وآخر ما فتحته من إنجازات
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leaderboard Card */}
          <div
          >
            <LeaderboardCard loading={loading} leaderboard={leaderboard} />
          </div>

          {/* Recent Achievements Card */}
          <div
          >
            <RecentAchievementsCard loading={loading} recentAchievements={recentAchievements} />
          </div>
        </div>
      </div>
    </section>
  );
});

export default SocialFeaturesSection;
