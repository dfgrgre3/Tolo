"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-api";

export type WhitelistType = "admin" | "api" | "webhook";
export type WhitelistStatus = "active" | "disabled";

export interface IPWhitelistEntry {
  id: string;
  ipAddress: string;
  cidr?: string;
  description?: string;
  type: WhitelistType;
  status: WhitelistStatus;
  createdBy: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  isTemporary: boolean;
  country?: string;
  city?: string;
}

export interface IPWhitelistSettings {
  isEnabled: boolean;
  enforceForAdmins: boolean;
  enforceForAPI: boolean;
  defaultAction: "allow" | "deny";
  allowInternalIPs: boolean;
  internalIPRanges: string[];
  logBlockedAttempts: boolean;
  notifyOnViolation: boolean;
}

export interface BlockedAttempt {
  id: string;
  ipAddress: string;
  attemptedAt: string;
  endpoint: string;
  method: string;
  userAgent?: string;
  location?: string;
  reason: string;
  count: number;
}

export function useIPWhitelist() {
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<IPWhitelistEntry | null>(null);

  // Fetch whitelist entries
  const entriesQuery = useQuery({
    queryKey: ["admin", "ip-whitelist"],
    queryFn: async () => {
      const response = await adminFetch("/admin/security/ip-whitelist");
      if (!response.ok) throw new Error("Failed to fetch IP whitelist");
      const data = await response.json();
      return (data.data?.entries || data.entries || []) as IPWhitelistEntry[];
    },
  });

  // Fetch whitelist settings
  const settingsQuery = useQuery({
    queryKey: ["admin", "ip-whitelist-settings"],
    queryFn: async () => {
      const response = await adminFetch("/admin/security/ip-whitelist/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      return (data.data || data) as IPWhitelistSettings;
    },
  });

  // Fetch blocked attempts
  const blockedAttemptsQuery = useQuery({
    queryKey: ["admin", "blocked-attempts"],
    queryFn: async () => {
      const response = await adminFetch("/admin/security/ip-whitelist/blocked");
      if (!response.ok) throw new Error("Failed to fetch blocked attempts");
      const data = await response.json();
      return (data.data?.attempts || data.attempts || []) as BlockedAttempt[];
    },
  });

  // Add IP to whitelist
  const addEntry = useMutation({
    mutationFn: async (payload: {
      ipAddress: string;
      cidr?: string;
      description?: string;
      type: WhitelistType;
      expiresAt?: string;
      isTemporary?: boolean;
    }) => {
      const response = await adminFetch("/admin/security/ip-whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add IP");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إضافة IP إلى القائمة البيضاء");
      queryClient.invalidateQueries({ queryKey: ["admin", "ip-whitelist"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إضافة IP");
    },
  });

  // Remove IP from whitelist
  const removeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await adminFetch(`/admin/security/ip-whitelist/${entryId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove IP");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم حذف IP من القائمة البيضاء");
      queryClient.invalidateQueries({ queryKey: ["admin", "ip-whitelist"] });
    },
    onError: () => {
      toast.error("فشل في حذف IP");
    },
  });

  // Update whitelist entry
  const updateEntry = useMutation({
    mutationFn: async ({ entryId, updates }: { entryId: string; updates: Partial<IPWhitelistEntry> }) => {
      const response = await adminFetch(`/admin/security/ip-whitelist/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Failed to update entry");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث الإدخال");
      queryClient.invalidateQueries({ queryKey: ["admin", "ip-whitelist"] });
    },
    onError: () => {
      toast.error("فشل في التحديث");
    },
  });

  // Update whitelist settings
  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<IPWhitelistSettings>) => {
      const response = await adminFetch("/admin/security/ip-whitelist/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات");
      queryClient.invalidateQueries({ queryKey: ["admin", "ip-whitelist-settings"] });
    },
    onError: () => {
      toast.error("فشل في تحديث الإعدادات");
    },
  });

  // Bulk add IPs
  const bulkAdd = useMutation({
    mutationFn: async (payload: { ipAddresses: string[]; description?: string; type: WhitelistType }) => {
      const response = await adminFetch("/admin/security/ip-whitelist/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to add IPs");
      return response.json();
    },
    onSuccess: (data) => {
      const added = data.data?.added || data.added || 0;
      toast.success(`تم إضافة ${added} عنوان IP`);
      queryClient.invalidateQueries({ queryKey: ["admin", "ip-whitelist"] });
    },
    onError: () => {
      toast.error("فشل في الإضافة المجمعة");
    },
  });

  // Get current IP
  const getCurrentIP = useCallback(async () => {
    try {
      const response = await adminFetch("/security/my-ip");
      if (response.ok) {
        const data = await response.json();
        return data.data?.ip || data.ip;
      }
    } catch {
      // Fail silently
    }
    return null;
  }, []);

  // Check if IP is whitelisted
  const checkIP = useCallback(async (ip: string) => {
    try {
      const response = await adminFetch(`/admin/security/ip-whitelist/check?ip=${ip}`);
      if (response.ok) {
        const data = await response.json();
        return data.data?.isWhitelisted || data.isWhitelisted;
      }
    } catch {
      return false;
    }
  }, []);

  // Group entries by type
  const entriesByType = entriesQuery.data?.reduce((acc, entry) => {
    if (!acc[entry.type]) {
      acc[entry.type] = [];
    }
    acc[entry.type].push(entry);
    return acc;
  }, {} as Record<WhitelistType, IPWhitelistEntry[]>);

  // Get stats
  const stats = {
    total: entriesQuery.data?.length || 0,
    active: entriesQuery.data?.filter((e) => e.status === "active").length || 0,
    temporary: entriesQuery.data?.filter((e) => e.isTemporary).length || 0,
    blockedAttempts: blockedAttemptsQuery.data?.length || 0,
  };

  return {
    // Data
    entries: entriesQuery.data || [],
    settings: settingsQuery.data,
    blockedAttempts: blockedAttemptsQuery.data || [],
    entriesByType,
    stats,
    selectedEntry,
    isLoading: entriesQuery.isLoading || settingsQuery.isLoading,

    // Selection
    setSelectedEntry,

    // Actions
    addEntry: addEntry.mutate,
    isAdding: addEntry.isPending,

    removeEntry: removeEntry.mutate,
    isRemoving: removeEntry.isPending,

    updateEntry: updateEntry.mutate,
    isUpdating: updateEntry.isPending,

    updateSettings: updateSettings.mutate,
    isUpdatingSettings: updateSettings.isPending,

    bulkAdd: bulkAdd.mutate,
    isBulkAdding: bulkAdd.isPending,

    getCurrentIP,
    checkIP,

    refetch: () => {
      entriesQuery.refetch();
      settingsQuery.refetch();
      blockedAttemptsQuery.refetch();
    },
  };
}

// Hook to get current IP info
export function useCurrentIP() {
  return useQuery({
    queryKey: ["current-ip"],
    queryFn: async () => {
      const response = await fetch("https://api.ipify.org?format=json");
      if (!response.ok) throw new Error("Failed to fetch IP");
      const data = await response.json();
      return data.ip as string;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
