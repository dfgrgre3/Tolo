"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-api";
import { apiRoutes } from "@/lib/api/routes";
import { generateId } from "@/lib/utils";

// Types for user journey tracking
export interface UserJourneyStep {
  id: string;
  userId: string;
  sessionId: string;
  page: string;
  action: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  duration?: number; // Time spent on this step
}

export interface UserJourney {
  userId: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  steps: UserJourneyStep[];
  totalDuration: number;
  conversionGoal?: string;
  completed: boolean;
}

export interface UserActivityMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number; uniqueVisitors: number }>;
  userFlows: Array<{ from: string; to: string; count: number }>;
}

export interface AnalyticsIntegration {
  // User journey tracking
  trackPageView: (page: string, metadata?: Record<string, unknown>) => void;
  trackEvent: (action: string, metadata?: Record<string, unknown>) => void;
  trackConversion: (goal: string, value?: number) => void;

  // Session management
  startSession: () => void;
  endSession: () => void;

  // Current journey state
  currentJourney: UserJourney | null;
  sessionId: string;
}

// Generate unique session ID
function generateSessionId(): string {
  return `sess_${generateId()}`;
}

export function useAnalyticsIntegration(userId?: string): AnalyticsIntegration {
  const [sessionId] = useState(() => generateSessionId());
  const [currentJourney, setCurrentJourney] = useState<UserJourney | null>(null);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // Start a new journey session
  const startSession = useCallback(() => {
    const journey: UserJourney = {
      userId: userId || "anonymous",
      sessionId,
      startedAt: new Date().toISOString(),
      steps: [],
      totalDuration: 0,
      completed: false,
    };
    setCurrentJourney(journey);
    setLastActivity(new Date());

    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("current_journey", JSON.stringify(journey));
    }
  }, [userId, sessionId]);

  // End the current session
  const endSession = useCallback(() => {
    if (!currentJourney) return;

    const endedJourney: UserJourney = {
      ...currentJourney,
      endedAt: new Date().toISOString(),
      totalDuration: Date.now() - new Date(currentJourney.startedAt).getTime(),
    };

    // Send to analytics API
    sendJourneyToAnalytics(endedJourney);

    setCurrentJourney(null);
    localStorage.removeItem("current_journey");
  }, [currentJourney]);

  // Track page view
  const trackPageView = useCallback(
    (page: string, metadata?: Record<string, unknown>) => {
      if (!currentJourney) {
        startSession();
      }

      const now = new Date();
      const step: UserJourneyStep = {
        id: `step_${Date.now()}`,
        userId: userId || "anonymous",
        sessionId,
        page,
        action: "page_view",
        metadata,
        timestamp: now.toISOString(),
        duration: 0, // Will be updated on next step
      };

      setCurrentJourney((prev) => {
        if (!prev) return null;

        // Update duration of previous step
        const updatedSteps = [...prev.steps];
        if (updatedSteps.length > 0) {
          const lastStep = updatedSteps[updatedSteps.length - 1];
          lastStep!.duration = now.getTime() - new Date(lastStep!.timestamp).getTime();
        }

        return {
          ...prev,
          steps: [...updatedSteps, step],
        };
      });

      setLastActivity(now);

      // Update localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "current_journey",
          JSON.stringify({
            ...currentJourney,
            steps: [...(currentJourney?.steps || []), step],
          })
        );
      }
    },
    [currentJourney, sessionId, userId, startSession]
  );

  // Track custom event
  const trackEvent = useCallback(
    (action: string, metadata?: Record<string, unknown>) => {
      if (!currentJourney) return;

      const step: UserJourneyStep = {
        id: `step_${Date.now()}`,
        userId: userId || "anonymous",
        sessionId,
        page: window?.location?.pathname || "unknown",
        action,
        metadata,
        timestamp: new Date().toISOString(),
      };

      setCurrentJourney((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          steps: [...prev.steps, step],
        };
      });
    },
    [currentJourney, sessionId, userId]
  );

  // Track conversion goal
  const trackConversion = useCallback(
    (goal: string, value?: number) => {
      if (!currentJourney) return;

      setCurrentJourney((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          conversionGoal: goal,
          completed: true,
        };
      });

      // Send conversion event immediately
      sendConversionEvent({
        userId: userId || "anonymous",
        sessionId,
        goal,
        value,
        timestamp: new Date().toISOString(),
        journeySteps: currentJourney.steps.length,
      });
    },
    [currentJourney, sessionId, userId]
  );

  // Auto-end session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [endSession]);

  // Restore session on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("current_journey");
    if (saved) {
      try {
        const journey: UserJourney = JSON.parse(saved);
        // Only restore if session is less than 30 minutes old
        const sessionAge = Date.now() - new Date(journey.startedAt).getTime();
        if (sessionAge < 30 * 60 * 1000) {
          setCurrentJourney(journey);
        } else {
          localStorage.removeItem("current_journey");
        }
      } catch {
        localStorage.removeItem("current_journey");
      }
    }
  }, []);

  return {
    trackPageView,
    trackEvent,
    trackConversion,
    startSession,
    endSession,
    currentJourney,
    sessionId,
  };
}

// Helper function to send journey data to analytics API
async function sendJourneyToAnalytics(journey: UserJourney) {
  try {
    await adminFetch("/admin/analytics/journey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(journey),
    });
  } catch {
    // Silently fail - analytics should not break user experience
  }
}

// Helper function to send conversion event
async function sendConversionEvent(event: {
  userId: string;
  sessionId: string;
  goal: string;
  value?: number;
  timestamp: string;
  journeySteps: number;
}) {
  try {
    await adminFetch("/admin/analytics/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Silently fail
  }
}

// Hook for admin to view user journeys
export function useUserJourneysAnalytics(userId?: string, dateRange?: { from: Date; to: Date }) {
  const queryClient = useQueryClient();

  const journeysQuery = useQuery({
    queryKey: ["admin", "user-journeys", userId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (dateRange) {
        params.set("from", dateRange.from.toISOString());
        params.set("to", dateRange.to.toISOString());
      }

      const response = await adminFetch(`/admin/analytics/journeys?${params}`);
      if (!response.ok) throw new Error("Failed to fetch journeys");
      const data = await response.json();
      return (data.data?.journeys || data.journeys || []) as UserJourney[];
    },
    enabled: !!dateRange,
  });

  const metricsQuery = useQuery({
    queryKey: ["admin", "activity-metrics", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set("from", dateRange.from.toISOString());
        params.set("to", dateRange.to.toISOString());
      }

      const response = await adminFetch(`/admin/analytics/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      return (data.data || data) as UserActivityMetrics;
    },
    enabled: !!dateRange,
  });

  // Export journeys data
  const exportJourneys = useMutation({
    mutationFn: async (format: "csv" | "json" = "csv") => {
      const response = await adminFetch(`/admin/analytics/journeys/export?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dateRange }),
      });

      if (!response.ok) throw new Error("Export failed");
      return response.blob();
    },
    onSuccess: (blob) => {
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-journeys-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  return {
    journeys: journeysQuery.data || [],
    metrics: metricsQuery.data,
    isLoading: journeysQuery.isLoading || metricsQuery.isLoading,
    refetch: () => {
      journeysQuery.refetch();
      metricsQuery.refetch();
    },
    exportJourneys: exportJourneys.mutate,
    isExporting: exportJourneys.isPending,
  };
}

// Hook for real-time activity monitoring
export function useRealtimeActivityMonitor() {
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [topPages, setTopPages] = useState<Array<{ page: string; count: number }>>([]);

  useEffect(() => {
    // This would connect to a WebSocket or polling endpoint
    // For now, return static values that would be updated by real data
    const interval = setInterval(() => {
      // Simulate fetching real-time data
      // In production, this would be: fetch('/api/admin/analytics/realtime')
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    activeUsers,
    activeSessions,
    topPages,
  };
}
