"use client";

import React, { useState, useEffect } from "react";
// Auth removed
import { ProgressSummary } from "@/lib/server-data-fetch";
import { UserHome } from "@/app/components/home/UserHome";
import { User as ApiUser } from "@/types/user";
import { UserRole } from "@/types/enums";
import { PerformanceMetric } from "./types";
import { safeFetch } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";

interface HomeClientProps {
  summary: ProgressSummary | null;
}

export function HomeClient({ summary }: HomeClientProps) {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // --- Data Fetching Logic for Performance ---
  useEffect(() => {
    async function fetchPerformance() {
      try {
        setMetricsLoading(true);
        // Using existing endpoint
        const { data } = await safeFetch<{ metrics: any }>(
          "/api/analytics/performance",
          undefined,
          null
        );

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
        logger.error("Failed to fetch performance metrics", err);
      } finally {
        setMetricsLoading(false);
      }
    }

    fetchPerformance();
  }, []);

  // --- User Transformation (Guest mode only) ---
  const guestUser: ApiUser = {
    id: 'guest',
    email: '',
    name: 'زائر',
    image: null,
    role: UserRole.USER,
    emailVerified: false,
    twoFactorEnabled: false,
    lastLogin: null,
    provider: 'local',
  };


  return (
    <UserHome 
      user={guestUser} 
      summary={summary} 
      performanceMetrics={performanceMetrics}
      metricsLoading={metricsLoading}
    />
  );
}
