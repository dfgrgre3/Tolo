"use client";

import React, { memo, useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Star, Award, CheckCircle2, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
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
            icon: <CheckCircle2 className="w-5 h-5 text-green-400" aria-hidden="true" />,
            value: rawAchievements.filter(a => (a.progress ?? 100) >= 100).length,
            label: "إنجاز مكتمل",
            color: "bg-green-500/10 border-green-500/20",
          },
          {
            id: "points",
            icon: <Star className="w-5 h-5 text-yellow-400" aria-hidden="true" />,
            value: (progress.totalXP ?? 0).toLocaleString("en-US"),
            label: "نقطة مكافأة",
            color: "bg-yellow-500/10 border-yellow-500/20",
          },
          {
            id: "level",
            icon: <Award className="w-5 h-5 text-purple-400" aria-hidden="true" />,
            value: `Lvl ${progress.level ?? 1}`,
            label: "المستوى الحالي",
            color: "bg-purple-500/10 border-purple-500/20",
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
        className="h-64 bg-white/5 rounded-3xl flex items-center justify-center"
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
      <section className={`${rpgCommonStyles.glassPanel} px-6 py-10 text-center`}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" aria-hidden="true" />
        <p className="text-lg font-medium text-red-300">{error}</p>
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
    <section className={`${rpgCommonStyles.glassPanel} px-6 py-10 relative overflow-hidden`}>
      <div 
        className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 mix-blend-overlay pointer-events-none" 
        aria-hidden="true"
      />
      
      <div className="relative z-10">
        {/* Header + Stats */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="text-center md:text-right">
            <Badge variant="outline" className="mb-3 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-2" aria-hidden="true" />
              <span>لوحة الشرف</span>
            </Badge>
            <h2 className={`text-3xl font-black ${rpgCommonStyles.goldText}`}>
              إنجازاتك الأسطورية
            </h2>
            <p className="text-muted-foreground text-sm mt-1">سجلك الحافل بالانتصارات والأوسمة</p>
          </div>

          {/* ✅ 8. Semantic Stats: استخدام dl/dt/dd لإمكانية الوصول */}
          <dl className="flex flex-wrap justify-center gap-3">
            {stats.map((stat) => (
              <div 
                key={stat.id} 
                className={`flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md ${stat.color}`}
              >
                <div className="shrink-0">{stat.icon}</div>
                <div className="text-center">
                  <dt className="text-[10px] text-gray-400 mt-1 sr-only">{stat.label}</dt>
                  <dd className="text-lg font-bold text-white leading-none" aria-label={`${stat.label}: ${stat.value}`}>
                    {stat.value}
                  </dd>
                  <span className="text-[10px] text-gray-400 mt-1 block md:hidden" aria-hidden="true">{stat.label}</span>
                </div>
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
              className="text-center py-16 text-gray-500 mb-8"
            >
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" aria-hidden="true" />
              <p className="text-lg font-medium">لم تفتح أي إنجاز بعد.</p>
              <p className="text-sm mt-2 opacity-60">أكمل مهامك وامتحاناتك لتبدأ في جمع الأوسمة.</p>
            </div>
          )}
        

        {/* Footer Link */}
        <div className="text-center">
          <Link href="/settings/achievements">
            <Button size="lg" variant="ghost" className="group text-gray-300 hover:text-white hover:bg-white/10">
              <span>عرض سجل الأوسمة الكامل</span>
              <ArrowRight 
                className="mr-2 h-4 w-4 rtl:rotate-180" 
                aria-hidden="true"
              />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
});

export default AchievementsSection;