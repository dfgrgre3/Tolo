"use client";

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Button } from "@/shared/button";
import { 
  Trophy,
  Share2,
  Users,
  TrendingUp,
  Star,
  Award,
  Crown,
  Medal,
  ArrowRight,
  Flame,
  Target
} from "lucide-react";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  avatar?: string;
  isCurrentUser?: boolean;
  badge?: string;
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
      try {
        // Fetch leaderboard
        const leaderResponse = await fetch("/api/gamification/leaderboard?limit=5");
        if (leaderResponse.ok) {
          const leaderData = await leaderResponse.json();
          setLeaderboard(leaderData.entries || []);
        } else {
          setLeaderboard(getMockLeaderboard());
        }

        // Fetch achievements
        const achievementsResponse = await fetch("/api/gamification/achievements?recent=true");
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();
          setRecentAchievements(achievementsData.achievements || []);
        } else {
          setRecentAchievements(getMockAchievements());
        }
      } catch {
        setLeaderboard(getMockLeaderboard());
        setRecentAchievements(getMockAchievements());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getMockLeaderboard = (): LeaderboardEntry[] => [
    { rank: 1, name: "أحمد محمد", score: 12500, badge: "🥇", isCurrentUser: false },
    { rank: 2, name: "فاطمة علي", score: 11800, badge: "🥈", isCurrentUser: false },
    { rank: 3, name: "محمد خالد", score: 11200, badge: "🥉", isCurrentUser: false },
    { rank: 4, name: "أنت", score: 9850, badge: "⭐", isCurrentUser: true },
    { rank: 5, name: "سارة أحمد", score: 9200, badge: "🏅", isCurrentUser: false }
  ];

  const getMockAchievements = (): Achievement[] => [
    {
      id: "1",
      title: "سلسلة 7 أيام",
      description: "أكملت 7 أيام متتالية من الدراسة",
      icon: <Flame className="h-6 w-6" />,
      unlockedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: "2",
      title: "معلم 100 ساعة",
      description: "وصلت إلى 100 ساعة إجمالية من الدراسة",
      icon: <Target className="h-6 w-6" />,
      unlockedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: "3",
      title: "متقن الرياضيات",
      description: "أكملت جميع دروس الرياضيات",
      icon: <Award className="h-6 w-6" />,
      progress: 85,
      total: 100
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Star className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatScore = (score: number) => {
    return new Intl.NumberFormat("ar-EG").format(score);
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-100/80 bg-white/80 px-6 md:px-12 py-12 shadow-xl backdrop-blur-md">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/25 via-transparent to-orange-200/25" />
      
      <div className="relative z-10">
        <motion.div
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
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-slate-200/80 shadow-lg h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span>لوحة المتصدرين</span>
                  </CardTitle>
                  <Link href="/leaderboard">
                    <Button variant="link" size="sm">
                      عرض الكل
                      <ArrowRight className="h-4 w-4 mr-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600" />
                  </div>
                ) : (
                  leaderboard.map((entry, index) => (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                        entry.isCurrentUser 
                          ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300" 
                          : "bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {entry.badge} {entry.name}
                          </span>
                          {entry.isCurrentUser && (
                            <Badge className="bg-yellow-600 text-white text-xs">أنت</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-muted-foreground">
                            {formatScore(entry.score)} نقطة
                          </span>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-slate-700">
                        #{entry.rank}
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Achievements */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-slate-200/80 shadow-lg h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    <span>إنجازات حديثة</span>
                  </CardTitle>
                  <Link href="/achievements">
                    <Button variant="link" size="sm">
                      عرض الكل
                      <ArrowRight className="h-4 w-4 mr-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                  </div>
                ) : (
                  recentAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:shadow-md transition-all"
                    >
                      <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 p-3 text-white">
                        {achievement.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        {achievement.progress !== undefined && achievement.total && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">التقدم</span>
                              <span className="font-semibold">
                                {achievement.progress} / {achievement.total}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                                transition={{ duration: 0.8 }}
                                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
                              />
                            </div>
                          </div>
                        )}
                        {achievement.unlockedAt && (
                          <div className="mt-2 flex items-center gap-2">
                            <Share2 className="h-3 w-3 text-muted-foreground" />
                            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                              شارك الإنجاز
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Share Achievements CTA */}
        <motion.div
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
        </motion.div>
      </div>
    </section>
  );
});

export default SocialFeaturesSection;

