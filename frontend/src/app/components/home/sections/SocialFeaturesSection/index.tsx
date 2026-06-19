"use client";

import { useState, useEffect, memo } from "react";
import { m } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { safeFetch, getSafeUserId } from "@/lib/safe-client-utils";
import { Users, Share2, Award } from "lucide-react";
import { logger } from "@/lib/logger";
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const userId = getSafeUserId();

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

        if (!leaderError && leaderData?.leaderboard) {
          const transformedLeaderboard: LeaderboardEntry[] = leaderData.leaderboard.map((entry, index) => ({
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

        if (!achievementsError && achievementsData?.achievements) {
          const transformedAchievements: Achievement[] = achievementsData.achievements.slice(0, 3).map((ach) => ({
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
        logger.error("Error fetching social data:", error);
        setLeaderboard([]);
        setRecentAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/25 via-transparent to-orange-200/25" />
      
      <div className="relative z-10">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-full bg-gradient-to-r from-yellow-600 to-orange-600 p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              الميزات الاجتماعية
            </h2>
          </div>
          <p className="text-muted-foreground text-lg">
            شارك إنجازاتك، تنافس مع الأصدقاء، وشاهد ترتيبك في لوحة المتصدرين
          </p>
        </m.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leaderboard Card */}
          <m.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <LeaderboardCard loading={loading} leaderboard={leaderboard} />
          </m.div>

          {/* Recent Achievements Card */}
          <m.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <RecentAchievementsCard loading={loading} recentAchievements={recentAchievements} />
          </m.div>
        </div>

        {/* Share Achievements CTA */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="border-0 bg-gradient-to-r from-yellow-600 to-orange-600 shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white/20 p-4 backdrop-blur-md">
                    <Share2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">شارك إنجازاتك مع الأصدقاء</h3>
                    <p className="text-white/80">
                      كن مصدر إلهام للآخرين وشارك رحلتك التعليمية
                    </p>
                  </div>
                </div>
                <Button className="bg-white text-orange-600 hover:bg-orange-50">
                  <Share2 className="h-4 w-4 mr-2" />
                  ابدأ المشاركة
                </Button>
              </div>
            </CardContent>
          </Card>
        </m.div>
      </div>
    </section>
  );
});

export default SocialFeaturesSection;
