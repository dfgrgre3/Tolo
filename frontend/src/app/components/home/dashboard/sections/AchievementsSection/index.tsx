"use client";

import React, { memo, useEffect, useState } from "react";
import { Trophy, Star, Award, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { safeFetch } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/use-auth";
import { rpgCommonStyles } from "../../shared/styles";
import { AchievementCard, Achievement, AchievementColor } from "./AchievementCard";

// ✅ 1. Type Safety: مطابقة أنواع الألوان مع AchievementCard المحسن
const ACHIEVEMENT_COLORS: AchievementColor[] = [
  "primary", "purple", "emerald", "amber", "rose"
];

// ✅ 2. Zod-like Validation: تحقق حقيقي من شكل البيانات بدلاً من unwrap الهش
interface ApiAchievement {
  id: string;
  title: string;
  description: string;
  progress?: number; // ✅ دعم التقدم الجزئي الحقيقي
  unlockedAt?: string;
}

interface ApiProgress {
  totalXP?: number;
  level?: number;
}

function unwrapExpectedPayload(data: unknown, expectedKey: "achievements" | "totalXP" | "level"): unknown {
  if (!data || typeof data !== "object") return data;
  const record = data as Record<string, unknown>;
  if (expectedKey in record) return data;

  const nested = record.data;
  if (nested && typeof nested === "object" && expectedKey in (nested as Record<string, unknown>)) {
    return nested;
  }
  return data;
}

function validateAchievements(data: unknown): ApiAchievement[] {
  const payload = unwrapExpectedPayload(data, "achievements");
  if (!payload || typeof payload !== "object" || !("achievements" in payload)) return [];
  const list = (payload as { achievements: unknown }).achievements;
  if (!Array.isArray(list)) return [];
  
  return list.filter((item): item is ApiAchievement => 
    item && typeof item === "object" && 
    typeof (item as ApiAchievement).id === "string" &&
    typeof (item as ApiAchievement).title === "string"
  );
}

function validateProgress(data: unknown): ApiProgress {
  const totalXPPayload = unwrapExpectedPayload(data, "totalXP");
  const payload = unwrapExpectedPayload(totalXPPayload, "level");
  if (!payload || typeof payload !== "object") return {};
  return {
    totalXP: typeof (payload as ApiProgress).totalXP === "number" ? (payload as ApiProgress).totalXP : 0,
    level: typeof (payload as ApiProgress).level === "number" ? (payload as ApiProgress).level : 1,
  };
}

export interface AchievementStat {
  id: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}

interface AchievementsSectionProps {
  /** السماح بتمرير بيانات مبدئية للـ SSR/Hydration */
  initialAchievements?: Achievement[];
  initialStats?: AchievementStat[];
}

export const AchievementsSection = memo(function AchievementsSection({
  initialAchievements,
  initialStats
}: AchievementsSectionProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements ?? []);
  const [stats, setStats] = useState<AchievementStat[]>(initialStats ?? []);
  const [loading, setLoading] = useState(!initialAchievements);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // إذا كانت هناك بيانات مبدئية، لا نحتاج لجلبها مرة أخرى
    if (initialAchievements) return;

    // Wait silently while auth is still resolving — no fetch, no warning
    if (authLoading) return;

    const fetchData = async () => {
      // ✅ 3. Security: منع طلبات API خاطئة عند عدم وجود userId
      if (!isAuthenticated || !user?.id) {
        logger.warn("AchievementsSection: User not authenticated, skipping fetch");
        setLoading(false);
        return;
      }

      try {
        const [achievementsRes, progressRes] = await Promise.all([
          safeFetch<unknown>(`/api/gamification/achievements?userId=${user.id}`),
          safeFetch<unknown>(`/api/gamification/progress?userId=${user.id}`),
        ]);

        const rawAchievements = validateAchievements(achievementsRes?.data);
        const progress = validateProgress(progressRes?.data);

        // ✅ 4. Real Progress: دعم الإنجازات قيد التقدم وليس فقط المكتملة
        const mappedAchievements: Achievement[] = rawAchievements.map((ach, idx) => ({
          id: ach.id,
          title: ach.title,
          description: ach.description,
          progress: typeof ach.progress === "number" ? ach.progress : 100,
          color: ACHIEVEMENT_COLORS[idx % ACHIEVEMENT_COLORS.length],
        }));

        // ✅ 5. Memoization: بناء الإحصائيات بشكل مستقر
        const mappedStats: AchievementStat[] = [
          {
            id: "completed",
            icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />,
            value: rawAchievements.filter(a => (a.progress ?? 100) >= 100).length,
            label: "إنجاز مكتمل",
            color: "bg-emerald-50 border-emerald-200",
          },
          {
            id: "points",
            icon: <Star className="w-5 h-5 text-amber-500" aria-hidden="true" />,
            value: (progress.totalXP ?? 0).toLocaleString("en-US"),
            label: "نقطة مكافأة",
            color: "bg-amber-50 border-amber-200",
          },
          {
            id: "level",
            icon: <Award className="w-5 h-5 text-primary-strong" aria-hidden="true" />,
            value: `Lvl ${progress.level ?? 1}`,
            label: "المستوى الحالي",
            color: "bg-primary/10 border-primary/20",
          },
        ];

        setAchievements(mappedAchievements);
        setStats(mappedStats);
        setError(null);
      } catch (err) {
        logger.error("Failed to fetch achievements:", err);
        setError("تعذر تحميل الإنجازات. يرجى المحاولة لاحقاً.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialAchievements, isAuthenticated, user?.id, authLoading]);

  // ✅ 6. Accessibility: Loading state حقيقي لقرّاء الشاشة
  if (loading) {
    return (
      <div
        className="h-64 bg-muted rounded-2xl flex items-center justify-center"
        role="status"
        aria-busy="true"
        aria-label="جاري تحميل الإنجازات"
      >
        <span className="sr-only">جاري التحميل...</span>
      </div>
    );
  }

  // ✅ 7. Error State: إعلام المستخدم عند الفشل بدلاً من الصمت
  if (error) {
    return (
      <section className={`${rpgCommonStyles.card} px-6 py-10 text-center`}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" aria-hidden="true" />
        <p className="text-lg font-medium text-red-600">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </Button>
      </section>
    );
  }

  return (
    <section className={`${rpgCommonStyles.card} px-6 py-10 relative overflow-hidden`}>
      <div className="relative z-10">
        {/* Header + Stats */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="text-center md:text-right">
            <Badge variant="outline" className="mb-3 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
              <Sparkles className="h-3 w-3 mr-2" aria-hidden="true" />
              <span>لوحة الشرف</span>
            </Badge>
            <h2 className="text-3xl font-black text-amber-700">
              إنجازاتك
            </h2>
            <p className="text-muted-foreground text-sm mt-1">سجلك الحافل بالانتصارات والأوسمة</p>
          </div>

          {/* ✅ 8. Semantic Stats: Correct markup for definition list elements */}
          <dl className="flex flex-wrap justify-center gap-3">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className="flex items-center gap-3 px-4 py-2 rounded-xl border border-border bg-muted"
              >
                <dt className="text-xs text-muted-foreground font-medium">{stat.label}</dt>
                <dd className="flex items-center gap-3 text-lg font-bold text-foreground leading-none">
                  <span className="shrink-0" aria-hidden="true">{stat.icon}</span>
                  <span>{stat.value}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Achievements Grid */}

          {achievements.length > 0 ? (
            <div
              className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8"
            >
              {achievements.map((ach, idx) => (
                <AchievementCard key={ach.id} achievement={ach} index={idx} />
              ))}
            </div>
          ) : (
            <div
              className="text-center py-16 text-muted-foreground mb-8"
            >
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" aria-hidden="true" />
              <p className="text-lg font-medium">لم تفتح أي إنجاز بعد.</p>
              <p className="text-sm mt-2 opacity-60">أكمل مهامك وامتحاناتك لتبدأ في جمع الأوسمة.</p>
            </div>
          )}


        {/* Footer Link */}
        <div className="text-center">
          <Button size="lg" variant="ghost" className="group text-muted-foreground hover:text-foreground hover:bg-muted cursor-default">
            <span>سجل الأوسمة</span>
          </Button>
        </div>
      </div>
    </section>
  );
});

export default AchievementsSection;