"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Trophy, Medal, Target, Zap } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: string;
}

interface RecentAchievementsProps {
  achievements: Achievement[];
}

const achievementIcons = {
  star: Star,
  trophy: Trophy,
  medal: Medal,
  target: Target,
  zap: Zap,
  award: Award,
};

export function RecentAchievements({ achievements }: RecentAchievementsProps) {
  if (!achievements || achievements.length === 0) {
    return (
      <Card className="shadow-lg border-2 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            الإنجازات الحديثة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد إنجازات حديثة</p>
            <p className="text-sm mt-1">ابدأ بإكمال المهام لكسب الإنجازات</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-xl border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Award className="h-5 w-5" />
            الإنجازات الحديثة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {achievements.map((achievement, index) => {
              const Icon = achievementIcons[achievement.icon as keyof typeof achievementIcons] || Award;
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border border-yellow-200 dark:border-yellow-800 hover:shadow-lg transition-shadow"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="flex-shrink-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-base text-yellow-700 dark:text-yellow-400">
                        {achievement.title}
                      </h4>
                      <Badge className="bg-yellow-400 text-yellow-900 border-0">
                        +{achievement.xpReward} XP
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(achievement.unlockedAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
