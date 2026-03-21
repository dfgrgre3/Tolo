"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ProgressSummary } from "@/lib/server-data-fetch";
import { UserHome } from "@/app/components/home/UserHome";
import LandingPage from "@/app/components/home/LandingPage";
import { User as ApiUser } from "@/types/user";
import { UserRole } from "@/types/enums";
import { PerformanceMetric } from "./types";
import { safeFetch } from "@/lib/safe-client-utils";
import { motion, AnimatePresence } from "framer-motion";

interface HomeClientProps {
  summary: ProgressSummary | null;
}

export function HomeClient({ summary }: HomeClientProps) {
  const { user: authUser, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // --- Data Fetching Logic for Performance ---
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setPerformanceMetrics([]);
      setMetricsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPerformance() {
      try {
        setMetricsLoading(true);
        const { data } = await safeFetch<{ metrics: any }>(
          "/api/analytics/performance",
          undefined,
          null
        );

        if (cancelled) return;

        if (data?.metrics) {
           const transformed: PerformanceMetric[] = Object.entries(data.metrics).map(([key, val]: [string, any]) => ({
             name: key,
             rpgName: key === "memory" ? "الذاكرة (Mana)" : key,
             value: Math.round(val.avg || 0),
             target: 100,
             unit: "%",
             trend: val.trend || "stable",
             status: val.avg > 80 ? "excellent" : "good",
           }));
           setPerformanceMetrics(transformed);
        } else {
             // Fallback/Mock Data
             setPerformanceMetrics([
                 { name: "speed", rpgName: "السرعة (Agility)", value: 92, target: 85, unit: "%", trend: "up", status: "excellent" },
                 { name: "accuracy", rpgName: "الدقة (Precision)", value: 88, target: 90, unit: "%", trend: "stable", status: "good" },
                 { name: "stamina", rpgName: "القدرة (Stamina)", value: 75, target: 80, unit: "%", trend: "down", status: "warning" },
                 { name: "focus", rpgName: "التركيز (Focus)", value: 95, target: 90, unit: "%", trend: "up", status: "excellent" },
                 { name: "xp_rate", rpgName: "معدل الخبرة (XP Rate)", value: 120, target: 100, unit: "xp/h", trend: "up", status: "excellent" },
             ]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch performance metrics", err);
      } finally {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      }
    }

    fetchPerformance();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)]"
         />
      </div>
    );
  }

  if (!isAuthenticated || !authUser) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
           key="landing"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
        >
          <LandingPage />
        </motion.div>
      </AnimatePresence>
    );
  }

  const displayUser: ApiUser = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name || authUser.username || null,
      username: authUser.username || null,
      avatar: authUser.avatar || null,
      role: (authUser.role as UserRole) || UserRole.USER,
      phone: authUser.phone || null,
      phoneVerified: false,
      emailVerified: authUser.emailVerified ?? false,
      createdAt: authUser.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      twoFactorEnabled: false,
      biometricEnabled: false,
      lastLogin: authUser.lastLogin || null,
      totalXP: authUser.totalXP ?? 0,
      level: authUser.level ?? 1,
      currentStreak: authUser.currentStreak ?? 0,
      longestStreak: 0,
      totalStudyTime: 0,
      tasksCompleted: 0,
      examsPassed: 0,
      pomodoroSessions: 0,
      deepWorkSessions: 0,
      studyXP: 0,
      taskXP: 0,
      examXP: 0,
      challengeXP: 0,
      questXP: 0,
      seasonXP: 0,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
         key="home"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
      >
        <UserHome 
          user={displayUser} 
          summary={summary} 
          performanceMetrics={performanceMetrics}
          metricsLoading={metricsLoading}
        />
      </motion.div>
    </AnimatePresence>
  );
}
