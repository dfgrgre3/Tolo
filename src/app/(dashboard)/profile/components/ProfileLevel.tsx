"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";

interface ProfileLevelProps {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
}

export function ProfileLevel({ level, currentXP, nextLevelXP, totalXP }: ProfileLevelProps) {
  const progressPercentage = (currentXP / nextLevelXP) * 100;
  const xpToNextLevel = nextLevelXP - currentXP;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden shadow-xl border-2 border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            المستوى والخبرة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Level Badge */}
          <div className="flex items-center justify-center mb-4">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white">{level}</span>
              </div>
              <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-2 border-background">
                المستوى
              </Badge>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التقدم للمستوى التالي</span>
              <span className="font-semibold text-primary">{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentXP} XP</span>
              <span>{nextLevelXP} XP</span>
            </div>
          </div>

          {/* XP Info */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-3 rounded-lg text-center border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">إجمالي الخبرة</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalXP} XP</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-3 rounded-lg text-center border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 mb-1">XP للمستوى التالي</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">{xpToNextLevel} XP</p>
            </div>
          </div>

          {/* XP Gain Info */}
          <motion.div
            className="bg-gradient-to-r from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-950 dark:to-orange-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">كيف تكسب XP؟</span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
              أكمل المهام، شارك في المنتدى، واجتز الامتحانات لكسب نقاط الخبرة
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
