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
    <Card className="border-border bg-card shadow-sm h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Award className="h-5 w-5 text-primary-strong" />
            <span>إنجازات حديثة</span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className=" rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : recentAchievements.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground font-bold mb-1">لم تفتح أي إنجاز بعد</p>
            <p className="text-sm text-muted-foreground">أكمل مهامك وامتحاناتك لتفتح إنجازاتك الأولى</p>
          </div>
        ) : (
          recentAchievements.map((achievement, index) => (
            <div
              key={`${achievement.id}-${index}`}
              className="flex items-start gap-4 p-4 rounded-xl bg-muted border border-border hover:border-primary/30"
            >
              <div className="flex-shrink-0 rounded-xl bg-primary p-3 text-primary-foreground">
                {achievement.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1">
                  {achievement.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {achievement.description}
                </p>
                {achievement.unlockedAt && (
                  <p className="text-xs text-muted-foreground">
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
