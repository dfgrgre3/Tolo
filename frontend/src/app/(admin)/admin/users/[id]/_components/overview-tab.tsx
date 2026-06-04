"use client";

import type { UserDetails } from "./types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Award,
  User as UserIcon,
  TrendingUp,
  Target,
  CheckCircle,
  BookOpen,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function OverviewTab({ user }: { user: UserDetails }) {
  const xpStats = [
    { label: "الدراسة", value: user.studyXP, color: "bg-blue-500" },
    { label: "المهام", value: user.taskXP, color: "bg-green-500" },
    { label: "الامتحانات", value: user.examXP, color: "bg-purple-500" },
    { label: "التحديات", value: user.challengeXP, color: "bg-orange-500" },
    { label: "الموسم", value: user.seasonXP, color: "bg-red-500" }
  ];

  const engagementStats = [
    { label: "المهام المكتملة", value: user.tasksCompleted, icon: CheckCircle, color: "text-green-500" },
    { label: "جلسات المذاكرة", value: user._count.studySessions, icon: BookOpen, color: "text-blue-500" },
    { label: "جلسات بومودورو", value: user.pomodoroSessions, icon: Clock, color: "text-orange-500" },
    { label: "أطول تتابع", value: `${user.longestStreak} يوم`, icon: Trophy, color: "text-yellow-500" },
    { label: "الإنجازات", value: user._count.achievements, icon: Award, color: "text-purple-500" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {user.bio && (
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              نبذة تعريفية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {user.bio}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              توزيع نقاط الخبرة (XP)
            </CardTitle>
            <CardDescription>تحليل لمصادر نقاط الخبرة التي اكتسبها المستخدم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {xpStats.map((xp, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>{xp.label}</span>
                  <span>{xp.value.toLocaleString()} XP</span>
                </div>
                <Progress
                  value={xp.value / (user.totalXP || 1) * 100}
                  className="h-2 rounded-full bg-muted"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              مؤشرات التفاعل
            </CardTitle>
            <CardDescription>نظرة مفصلة على تفاعل المستخدم مع المنصة</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {engagementStats.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 px-6">
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            آخر الإنجازات
          </CardTitle>
          <Button variant="ghost" size="sm" className="rounded-xl">عرض الكل</Button>
        </CardHeader>
        <CardContent>
          {user.achievements.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {user.achievements.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{item.achievement.title}</p>
                    <p className="text-xs text-primary font-medium">+{item.achievement.xpReward} XP</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(item.earnedAt), "d MMM yyyy", { locale: ar })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              لا توجد إنجازات مسجلة حالياً
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
