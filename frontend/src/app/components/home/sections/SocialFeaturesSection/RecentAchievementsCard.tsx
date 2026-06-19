"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ArrowRight, Share2 } from "lucide-react";
import Link from "next/link";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlockedAt?: Date;
  progress?: number;
  total?: number;
}

interface RecentAchievementsCardProps {
  loading: boolean;
  recentAchievements: Achievement[];
}

export const RecentAchievementsCard = ({ loading, recentAchievements }: RecentAchievementsCardProps) => {
  return (
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
            <m.div
              key={`${achievement.id}-${index}`}
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
                {achievement.progress !== undefined && achievement.total && achievement.total > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">التقدم</span>
                      <span className="font-semibold">
                        {achievement.progress} / {achievement.total}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <m.div
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
            </m.div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RecentAchievementsCard;
