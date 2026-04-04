"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ProgressSummary } from "@/lib/server-data-fetch";
import { UserHome } from "@/app/components/home/UserHome";
import LandingPage from "@/app/components/home/LandingPage";
import { User as ApiUser } from "@/types/user";
import { UserRole, UserStatus } from "@/types/enums";
import { PerformanceMetric } from "./types";
import { safeFetch } from "@/lib/safe-client-utils";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from '@/lib/logger';

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
             setPerformanceMetrics([]);
        }
      } catch (err) {
        if (cancelled) return;
        logger.error("Failed to fetch performance metrics", err);
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
      status: (authUser.status as UserStatus) || UserStatus.ACTIVE,
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
      longestStreak: authUser.longestStreak ?? 0,
      totalStudyTime: authUser.totalStudyTime ?? 0,
      tasksCompleted: authUser.tasksCompleted ?? 0,
      examsPassed: authUser.examsPassed ?? 0,
      pomodoroSessions: authUser.pomodoroSessions ?? 0,
      deepWorkSessions: authUser.deepWorkSessions ?? 0,
      studyXP: authUser.studyXP ?? 0,
      taskXP: authUser.taskXP ?? 0,
      examXP: authUser.examXP ?? 0,
      challengeXP: authUser.challengeXP ?? 0,
      questXP: authUser.questXP ?? 0,
      seasonXP: authUser.seasonXP ?? 0,
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
