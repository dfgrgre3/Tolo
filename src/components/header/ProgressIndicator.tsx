"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, Clock, Award } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { requestCache } from "@/lib/api/request-cache";
import { logger } from "@/lib/logger";

interface ProgressData {
  label: string;
  value: number;
  max: number;
  icon: React.ReactNode;
  color: string;
}

interface ProgressSummary {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
}

function ProgressIndicator() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fetchScheduled = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!mounted || !isAuthenticated) return;
    if (fetchScheduled.current) return;
    fetchScheduled.current = true;

    const doFetch = async () => {
      try {
        const options: RequestInit = { credentials: "include" };
        const response = await requestCache.getResponse(
          "/api/progress/summary",
          options,
          () => fetch("/api/progress/summary", options)
        );

        if (!response.ok) {
          throw new Error(`Progress request failed: ${response.status}`);
        }

        const summary = await response.json() as ProgressSummary;
        const hours = Math.round((summary.totalMinutes || 0) / 60);
        const data: ProgressData[] = [
          {
            label: "المهام",
            value: summary.tasksCompleted || 0,
            max: 10,
            icon: <BookOpen className="h-3 w-3" />,
            color: "bg-blue-500"
          },
          {
            label: "ساعات الدراسة",
            value: hours,
            max: 40,
            icon: <Clock className="h-3 w-3" />,
            color: "bg-green-500"
          },
          {
            label: "التركيز",
            value: Math.round(summary.averageFocus || 0),
            max: 100,
            icon: <Award className="h-3 w-3" />,
            color: "bg-yellow-500"
          }
        ];

        setProgressData(data);
        setIsVisible(data.some((item) => item.value > 0));
      } catch (error) {
        logger.debug("Failed to fetch progress:", error);
        setIsVisible(false);
      } finally {
        fetchScheduled.current = false;
      }
    };

    const scheduleFetch = (deadline?: IdleDeadline) => {
      if (deadline && deadline.timeRemaining() < 1) {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(scheduleFetch, { timeout: 3000 });
        } else {
          setTimeout(doFetch, 1000);
        }
        return;
      }
      void doFetch();
    };

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(scheduleFetch, { timeout: 3000 });
    } else {
      setTimeout(doFetch, 2000);
    }
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    if (!mounted || !isAuthenticated) {
      setIsVisible(false);
      return;
    }

    void fetchProgress();
    const interval = setInterval(fetchProgress, 300000);

    return () => clearInterval(interval);
  }, [mounted, isAuthenticated, fetchProgress]);

  const shouldShow = useMemo(() => {
    if (!mounted) return false;
    const showPages = ["/", "/courses", "/analytics", "/achievements"];
    return showPages.some((page) => pathname?.startsWith(page));
  }, [pathname, mounted]);

  if (!shouldShow || !isVisible || progressData.length === 0) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 backdrop-blur-sm"
      >
        {progressData.slice(0, 2).map((item, index) => {
          const percentage = item.max > 0 ? Math.min((item.value / item.max) * 100, 100) : 0;
          return (
            <div key={index} className="flex items-center gap-2 min-w-[120px]">
              <div className={cn("p-1.5 rounded-md", item.color, "text-white")}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {Math.round(percentage)}%
                  </span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </m.div>
    </AnimatePresence>
  );
}

export default ProgressIndicator;
