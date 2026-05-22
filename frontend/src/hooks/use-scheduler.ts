"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-api";

export type ScheduledItemType = "announcement" | "exam" | "task" | "post" | "content";

export type ScheduleFrequency = "once" | "daily" | "weekly" | "monthly";

export interface ScheduledItem {
  id: string;
  type: ScheduledItemType;
  title: string;
  description?: string;
  content: Record<string, unknown>;
  scheduledFor: string;
  timezone: string;
  frequency: ScheduleFrequency;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  createdBy: string;
  createdAt: string;
  executedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface CreateSchedulePayload {
  type: ScheduledItemType;
  title: string;
  description?: string;
  content: Record<string, unknown>;
  scheduledFor: string;
  timezone?: string;
  frequency?: ScheduleFrequency;
  maxRetries?: number;
}

export function useScheduler() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    type?: ScheduledItemType;
    status?: ScheduledItem["status"];
    from?: string;
    to?: string;
  }>({});

  // Fetch scheduled items
  const scheduledItemsQuery = useQuery({
    queryKey: ["admin", "scheduler", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const response = await adminFetch(`/admin/scheduler?${params}`);
      if (!response.ok) throw new Error("Failed to fetch scheduled items");
      const data = await response.json();
      return (data.data?.items || data.items || []) as ScheduledItem[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create scheduled item
  const createSchedule = useMutation({
    mutationFn: async (payload: CreateSchedulePayload) => {
      const response = await adminFetch("/admin/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create schedule");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم جدولة العنصر بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "scheduler"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في جدولة العنصر");
    },
  });

  // Cancel scheduled item
  const cancelSchedule = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminFetch(`/admin/scheduler/${id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to cancel schedule");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إلغاء الجدولة");
      queryClient.invalidateQueries({ queryKey: ["admin", "scheduler"] });
    },
    onError: () => {
      toast.error("فشل في إلغاء الجدولة");
    },
  });

  // Retry failed item
  const retrySchedule = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminFetch(`/admin/scheduler/${id}/retry`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to retry");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تمت إعادة محاولة التنفيذ");
      queryClient.invalidateQueries({ queryKey: ["admin", "scheduler"] });
    },
    onError: () => {
      toast.error("فشل في إعادة المحاولة");
    },
  });

  // Execute immediately
  const executeNow = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminFetch(`/admin/scheduler/${id}/execute`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to execute");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تنفيذ العنصر فوراً");
      queryClient.invalidateQueries({ queryKey: ["admin", "scheduler"] });
    },
    onError: () => {
      toast.error("فشل في التنفيذ الفوري");
    },
  });

  // Delete scheduled item
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminFetch(`/admin/scheduler/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم حذف الجدولة");
      queryClient.invalidateQueries({ queryKey: ["admin", "scheduler"] });
    },
    onError: () => {
      toast.error("فشل في حذف الجدولة");
    },
  });

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Get upcoming items
  const upcomingItems = scheduledItemsQuery.data?.filter(
    (item) => item.status === "pending" && new Date(item.scheduledFor) > new Date()
  ) || [];

  // Get stats
  const stats = {
    total: scheduledItemsQuery.data?.length || 0,
    pending: scheduledItemsQuery.data?.filter((i) => i.status === "pending").length || 0,
    completed: scheduledItemsQuery.data?.filter((i) => i.status === "completed").length || 0,
    failed: scheduledItemsQuery.data?.filter((i) => i.status === "failed").length || 0,
  };

  return {
    // Data
    items: scheduledItemsQuery.data || [],
    upcomingItems,
    stats,
    filters,
    isLoading: scheduledItemsQuery.isLoading,
    isError: scheduledItemsQuery.isError,

    // Actions
    createSchedule: createSchedule.mutate,
    createScheduleAsync: createSchedule.mutateAsync,
    isCreating: createSchedule.isPending,

    cancelSchedule: cancelSchedule.mutate,
    isCancelling: cancelSchedule.isPending,

    retrySchedule: retrySchedule.mutate,
    isRetrying: retrySchedule.isPending,

    executeNow: executeNow.mutate,
    isExecuting: executeNow.isPending,

    deleteSchedule: deleteSchedule.mutate,
    isDeleting: deleteSchedule.isPending,

    updateFilters,
    refetch: scheduledItemsQuery.refetch,
  };
}

// Hook for scheduling announcements specifically
export function useScheduledAnnouncements() {
  const scheduler = useScheduler();

  const scheduleAnnouncement = useCallback(
    (title: string, message: string, scheduledFor: string, options?: { targetUsers?: string[] }) => {
      return scheduler.createSchedule({
        type: "announcement",
        title,
        description: message,
        content: {
          message,
          targetUsers: options?.targetUsers || ["all"],
        },
        scheduledFor,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    },
    [scheduler]
  );

  return {
    ...scheduler,
    scheduleAnnouncement,
    announcements: scheduler.items.filter((i) => i.type === "announcement"),
  };
}

// Hook for scheduling exams
export function useScheduledExams() {
  const scheduler = useScheduler();

  const scheduleExam = useCallback(
    (examId: string, title: string, scheduledFor: string, options?: { duration?: number; notifyStudents?: boolean }) => {
      return scheduler.createSchedule({
        type: "exam",
        title,
        content: {
          examId,
          duration: options?.duration || 60,
          notifyStudents: options?.notifyStudents !== false,
        },
        scheduledFor,
      });
    },
    [scheduler]
  );

  return {
    ...scheduler,
    scheduleExam,
    scheduledExams: scheduler.items.filter((i) => i.type === "exam"),
  };
}

// Hook for scheduling tasks/challenges
export function useScheduledTasks() {
  const scheduler = useScheduler();

  const scheduleTask = useCallback(
    (taskId: string, title: string, scheduledFor: string, options?: { dueDate?: string; points?: number }) => {
      return scheduler.createSchedule({
        type: "task",
        title,
        content: {
          taskId,
          dueDate: options?.dueDate,
          points: options?.points || 100,
        },
        scheduledFor,
      });
    },
    [scheduler]
  );

  return {
    ...scheduler,
    scheduleTask,
    scheduledTasks: scheduler.items.filter((i) => i.type === "task"),
  };
}
