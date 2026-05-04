"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-api";

export type BackupType = "full" | "database" | "files" | "incremental";
export type BackupStatus = "pending" | "in_progress" | "completed" | "failed" | "restoring";

export interface Backup {
  id: string;
  name: string;
  type: BackupType;
  size: number; // in bytes
  status: BackupStatus;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  tables?: string[]; // for database backups
  includesFiles: boolean;
  includesDatabase: boolean;
  retentionDays: number;
  checksum: string;
  downloadUrl?: string;
  restorePoints?: {
    id: string;
    timestamp: string;
    description: string;
  }[];
}

export interface RestoreOptions {
  backupId: string;
  targetTables?: string[]; // specific tables to restore
  skipExisting?: boolean; // skip if data already exists
  dryRun?: boolean; // validate without actually restoring
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackupAt?: string;
  scheduledBackups: number;
  autoDeleteCount: number;
  storageUsed: number;
  storageLimit: number;
}

export function useBackupManager() {
  const queryClient = useQueryClient();
  const [activeOperation, setActiveOperation] = useState<string | null>(null);

  // Fetch backups
  const backupsQuery = useQuery({
    queryKey: ["admin", "backups"],
    queryFn: async () => {
      const response = await adminFetch("/admin/backups");
      if (!response.ok) throw new Error("Failed to fetch backups");
      const data = await response.json();
      return (data.data?.backups || data.backups || []) as Backup[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch stats
  const statsQuery = useQuery({
    queryKey: ["admin", "backup-stats"],
    queryFn: async () => {
      const response = await adminFetch("/admin/backups/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      return (data.data || data) as BackupStats;
    },
  });

  // Create backup
  const createBackup = useMutation({
    mutationFn: async (payload: {
      name?: string;
      type: BackupType;
      tables?: string[];
      includesFiles?: boolean;
      includesDatabase?: boolean;
      retentionDays?: number;
    }) => {
      const response = await adminFetch("/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create backup");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم بدء إنشاء النسخة الاحتياطية");
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "backup-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إنشاء النسخة الاحتياطية");
    },
  });

  // Restore backup
  const restoreBackup = useMutation({
    mutationFn: async (options: RestoreOptions) => {
      setActiveOperation(`restore-${options.backupId}`);
      const response = await adminFetch(`/admin/backups/${options.backupId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      setActiveOperation(null);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to restore backup");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تمت استعادة النسخة الاحتياطية بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
    },
    onError: (error: Error) => {
      setActiveOperation(null);
      toast.error(error.message || "فشل في استعادة النسخة الاحتياطية");
    },
  });

  // Delete backup
  const deleteBackup = useMutation({
    mutationFn: async (backupId: string) => {
      const response = await adminFetch(`/admin/backups/${backupId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete backup");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم حذف النسخة الاحتياطية");
      queryClient.invalidateQueries({ queryKey: ["admin", "backups"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "backup-stats"] });
    },
    onError: () => {
      toast.error("فشل في حذف النسخة الاحتياطية");
    },
  });

  // Download backup
  const downloadBackup = useCallback(async (backupId: string, filename: string) => {
    try {
      const response = await adminFetch(`/admin/backups/${backupId}/download`, {
        method: "GET",
      });

      if (!response.ok) throw new Error("Failed to download backup");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("تم تحميل النسخة الاحتياطية");
    } catch {
      toast.error("فشل في تحميل النسخة الاحتياطية");
    }
  }, []);

  // Verify backup integrity
  const verifyBackup = useMutation({
    mutationFn: async (backupId: string) => {
      setActiveOperation(`verify-${backupId}`);
      const response = await adminFetch(`/admin/backups/${backupId}/verify`, {
        method: "POST",
      });

      setActiveOperation(null);

      if (!response.ok) throw new Error("Verification failed");
      return response.json();
    },
    onSuccess: (data) => {
      const isValid = data.data?.valid || data.valid;
      if (isValid) {
        toast.success("النسخة الاحتياطية سليمة");
      } else {
        toast.error("النسخة الاحتياطية تالفة");
      }
    },
    onError: () => {
      setActiveOperation(null);
      toast.error("فشل في التحقق من النسخة الاحتياطية");
    },
  });

  // Schedule automatic backup
  const scheduleBackup = useMutation({
    mutationFn: async (payload: {
      frequency: "daily" | "weekly" | "monthly";
      type: BackupType;
      time: string; // HH:mm format
      dayOfWeek?: number; // 0-6 for weekly
      dayOfMonth?: number; // 1-31 for monthly
      retentionDays: number;
    }) => {
      const response = await adminFetch("/admin/backups/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to schedule backup");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم جدولة النسخ الاحتياطي التلقائي");
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في جدولة النسخ الاحتياطي");
    },
  });

  // Cancel scheduled backup
  const cancelScheduledBackup = useMutation({
    mutationFn: async (scheduleId: string) => {
      const response = await adminFetch(`/admin/backups/schedule/${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to cancel scheduled backup");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إلغاء الجدولة");
    },
    onError: () => {
      toast.error("فشل في إلغاء الجدولة");
    },
  });

  // Get database tables
  const tablesQuery = useQuery({
    queryKey: ["admin", "database-tables"],
    queryFn: async () => {
      const response = await adminFetch("/admin/backups/tables");
      if (!response.ok) throw new Error("Failed to fetch tables");
      const data = await response.json();
      return (data.data?.tables || data.tables || []) as string[];
    },
  });

  // Calculate storage percentage
  const storagePercentage = statsQuery.data
    ? (statsQuery.data.storageUsed / statsQuery.data.storageLimit) * 100
    : 0;

  return {
    // Data
    backups: backupsQuery.data || [],
    stats: statsQuery.data,
    tables: tablesQuery.data || [],
    storagePercentage,
    isLoading: backupsQuery.isLoading || statsQuery.isLoading,
    isLoadingTables: tablesQuery.isLoading,
    activeOperation,

    // Actions
    createBackup: createBackup.mutate,
    createBackupAsync: createBackup.mutateAsync,
    isCreating: createBackup.isPending,

    restoreBackup: restoreBackup.mutate,
    isRestoring: restoreBackup.isPending,

    deleteBackup: deleteBackup.mutate,
    isDeleting: deleteBackup.isPending,

    downloadBackup,
    verifyBackup: verifyBackup.mutate,
    isVerifying: verifyBackup.isPending,

    scheduleBackup: scheduleBackup.mutate,
    isScheduling: scheduleBackup.isPending,

    cancelScheduledBackup: cancelScheduledBackup.mutate,

    refetch: () => {
      backupsQuery.refetch();
      statsQuery.refetch();
    },
  };
}

// Hook for backup progress tracking
export function useBackupProgress(backupId?: string) {
  const [progress, setProgress] = useState<{
    percent: number;
    status: BackupStatus;
    message: string;
    eta?: number;
  }>({
    percent: 0,
    status: "pending",
    message: "",
  });

  useQuery({
    queryKey: ["backup-progress", backupId],
    queryFn: async () => {
      if (!backupId) return null;
      const response = await adminFetch(`/admin/backups/${backupId}/progress`);
      if (!response.ok) throw new Error("Failed to fetch progress");
      const result = await response.json();

      const progressData = result.data || result;

      setProgress({
        percent: progressData.percent || 0,
        status: progressData.status || "pending",
        message: progressData.message || "",
        eta: progressData.eta,
      });

      return result;
    },
    enabled: !!backupId,
    refetchInterval: (query) => {
      const result = query?.state?.data;
      const progressData = result?.data || result;
      const status = progressData?.status;
      return status === "in_progress" ? 1000 : false;
    },
  });

  return progress;
}
