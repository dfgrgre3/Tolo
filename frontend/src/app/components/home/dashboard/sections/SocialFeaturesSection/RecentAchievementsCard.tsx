"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

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
    <Card className="border-white/10 bg-black/30 shadow-lg h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <Award className="h-5 w-5 text-purple-400" />
            <span>إنجازات حديثة</span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className=" rounded-full h-6 w-6 border-b-2 border-purple-500" />
          </div>
        ) : recentAchievements.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 font-bold mb-1">لم تفتح أي إنجاز بعد</p>
            <p className="text-sm text-gray-600">أكمل مهامك وامتحاناتك لتفتح إنجازاتك الأولى</p>
          </div>
        ) : (
          recentAchievements.map((achievement, index) => (
            <div
              key={`${achievement.id}-${index}`}
              className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30"
            >
              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 p-3 text-white">
                {achievement.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-100 mb-1">
                  {achievement.title}
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  {achievement.description}
                </p>
                {achievement.unlockedAt && (
                  <p className="text-xs text-gray-500">
                    فُتح في{" "}
                    {achievement.unlockedAt.toLocaleDateString("ar-EG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RecentAchievementsCard;
