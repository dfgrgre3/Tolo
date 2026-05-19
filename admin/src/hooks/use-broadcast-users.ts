"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/admin-api";
import type { UserModel } from "@/components/admin/broadcast/types";

interface BroadcastMessage {
  title: string;
  body?: string;
  type?: "info" | "success" | "warning" | "error";
  url?: string;
}

export type BroadcastUser = UserModel;

export interface UserSegment {
  id: string;
  name: string;
  count: number;
  filters: Record<string, unknown>;
}

export function useBroadcastUsers() {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<Error | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Fetch all users for broadcast
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["admin", "broadcast-users"],
    queryFn: async () => {
      const response = await adminFetch("/admin/users?limit=1000&fields=id,name,email,avatar,role,lastLogin");
      if (!response.ok) throw new Error("Failed to fetch users");
      const json = await response.json();
      return (json.data?.users || []) as UserModel[];
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Fetch predefined segments
  const { data: segments, isLoading: isLoadingSegments } = useQuery({
    queryKey: ["admin", "user-segments"],
    queryFn: async () => {
      // Return default segments
      return [
        { id: "all", name: "جميع المستخدمين", count: usersData?.length || 0, filters: {} },
        { id: "active", name: "مستخدمين نشطين (آخر 7 أيام)", count: 0, filters: { lastActive: "7d" } },
        { id: "inactive", name: "مستخدمين غير نشطين", count: 0, filters: { lastActive: "30d", inactive: true } },
        { id: "students", name: "الطلاب فقط", count: 0, filters: { role: "STUDENT" } },
        { id: "teachers", name: "المعلمين فقط", count: 0, filters: { role: "TEACHER" } },
        { id: "admins", name: "الإداريين فقط", count: 0, filters: { role: "ADMIN" } },
        { id: "new", name: "مستخدمين جدد (آخر 30 يوم)", count: 0, filters: { createdAfter: "30d" } },
      ] as UserSegment[];
    },
    enabled: !!usersData,
  });

  // Filter users based on segment and search
  const filteredUsers: UserModel[] = useMemo(() => {
    if (!usersData) return [];
    
    let filtered = [...usersData];
    
    // Apply segment filter
    if (selectedSegment && selectedSegment !== "all") {
      const segment = segments?.find(s => s.id === selectedSegment);
      if (segment) {
        switch (segment.id) {
          case "students":
            filtered = filtered.filter(u => u.role === "STUDENT");
            break;
          case "teachers":
            filtered = filtered.filter(u => u.role === "TEACHER");
            break;
          case "admins":
            filtered = filtered.filter(u => u.role === "ADMIN");
            break;
          case "active":
            filtered = filtered.filter(u => {
              if (!u.lastLogin) return false;
              const daysSince = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
              return daysSince <= 7;
            });
            break;
          case "inactive":
            filtered = filtered.filter(u => {
              if (!u.lastLogin) return true;
              const daysSince = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
              return daysSince > 30;
            });
            break;
          case "new":
            // This would need createdAt field - include all for now
            break;
        }
      }
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        u => 
          u.name?.toLowerCase().includes(query) || 
          u.email?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [usersData, selectedSegment, segments, searchQuery]);

  const selectSegment = useCallback((segmentId: string | null) => {
    setSelectedSegment(segmentId);
  }, []);

  const setSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
  }, [filteredUsers]);

  const deselectAll = useCallback(() => {
    setSelectedUserIds(new Set());
  }, []);

  const sendBroadcast = useCallback(async (message: string, type: string = "info") => {
    if (selectedUserIds.size === 0) {
      setError(new Error("No users selected"));
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await adminFetch("/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          message,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send broadcast");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsSending(false);
    }
  }, [selectedUserIds]);

  return {
    users: (usersData || []) as UserModel[],
    filteredUsers: filteredUsers as UserModel[],
    segments: segments || [],
    selectedSegment,
    searchQuery,
    isLoading: isLoadingUsers || isLoadingSegments,
    selectSegment,
    setSearch,
    selectedUserIds: Array.from(selectedUserIds),
    toggleUserSelection,
    selectAll,
    deselectAll,
    sendBroadcast,
    isSending,
    error,
  };
}
