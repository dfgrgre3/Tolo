"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { throwIfApiError } from "@/lib/api/api-error-utils";
import { adminFetch } from "@/lib/api/admin-api";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "escalated";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "technical" | "billing" | "content" | "account" | "other";

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "user" | "system";
  message: string;
  attachments?: { name: string; url: string; size: number }[];
  isInternal?: boolean; // Internal note visible only to admins
  createdAt: string;
  readAt?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string;
  assignedToName?: string;
  messages: TicketMessage[];
  tags?: string[];
  relatedEntityType?: string; // exam, course, etc.
  relatedEntityId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfactionRating?: number; // 1-5
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  search?: string;
  from?: string;
  to?: string;
}

export function useSupportTickets() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TicketFilters>({});
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Fetch tickets
  const ticketsQuery = useQuery({
    queryKey: ["admin", "tickets", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await adminFetch(`/admin/tickets?${params}`);
      await throwIfApiError(response, "تعذر تحميل التذاكر");
      const data = await response.json();
      return (data.data?.tickets || data.tickets || []) as SupportTicket[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch single ticket with messages
  const ticketDetailsQuery = useQuery({
    queryKey: ["admin", "ticket", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const response = await adminFetch(`/admin/tickets/${selectedTicketId}`);
      await throwIfApiError(response, "تعذر تحميل التذكرة");
      const data = await response.json();
      return (data.data?.ticket || data.ticket) as SupportTicket;
    },
    enabled: !!selectedTicketId,
  });

  // Create ticket (for admin-initiated conversations)
  const createTicket = useMutation({
    mutationFn: async (payload: {
      userId: string;
      subject: string;
      description: string;
      category: TicketCategory;
      priority?: TicketPriority;
    }) => {
      const response = await adminFetch("/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await throwIfApiError(response, "فشل إنشاء التذكرة");

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إنشاء التذكرة");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إنشاء التذكرة");
    },
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({
      ticketId,
      message,
      attachments,
      isInternal,
    }: {
      ticketId: string;
      message: string;
      attachments?: File[];
      isInternal?: boolean;
    }) => {
      const formData = new FormData();
      formData.append("message", message);
      formData.append("isInternal", String(isInternal || false));
      attachments?.forEach((file) => formData.append("attachments", file));

      const response = await adminFetch(`/admin/tickets/${ticketId}/messages`, {
        method: "POST",
        body: formData,
      });

      await throwIfApiError(response, "فشل إرسال الرسالة");

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket", selectedTicketId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إرسال الرسالة");
    },
  });

  // Update ticket status
  const updateStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const response = await adminFetch(`/admin/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      await throwIfApiError(response, "فشل تحديث الحالة");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket", selectedTicketId] });
    },
    onError: () => {
      toast.error("فشل في تحديث الحالة");
    },
  });

  // Update priority
  const updatePriority = useMutation({
    mutationFn: async ({ ticketId, priority }: { ticketId: string; priority: TicketPriority }) => {
      const response = await adminFetch(`/admin/tickets/${ticketId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });

      await throwIfApiError(response, "فشل تحديث الأولوية");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث الأولوية");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: () => {
      toast.error("فشل في تحديث الأولوية");
    },
  });

  // Assign ticket
  const assignTicket = useMutation({
    mutationFn: async ({ ticketId, adminId }: { ticketId: string; adminId: string }) => {
      const response = await adminFetch(`/admin/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });

      await throwIfApiError(response, "فشل تعيين التذكرة");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم تعيين التذكرة");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket", selectedTicketId] });
    },
    onError: () => {
      toast.error("فشل في تعيين التذكرة");
    },
  });

  // Add tag
  const addTag = useMutation({
    mutationFn: async ({ ticketId, tag }: { ticketId: string; tag: string }) => {
      const response = await adminFetch(`/admin/tickets/${ticketId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      });

      await throwIfApiError(response, "فشل إضافة الوسم");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket", selectedTicketId] });
    },
  });

  // Close ticket
  const closeTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await adminFetch(`/admin/tickets/${ticketId}/close`, {
        method: "POST",
      });

      await throwIfApiError(response, "فشل إغلاق التذكرة");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إغلاق التذكرة");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket", selectedTicketId] });
    },
    onError: () => {
      toast.error("فشل في إغلاق التذكرة");
    },
  });

  // Get stats
  const statsQuery = useQuery({
    queryKey: ["admin", "ticket-stats"],
    queryFn: async () => {
      const response = await adminFetch("/admin/tickets/stats");
      await throwIfApiError(response, "تعذر تحميل إحصائيات التذاكر");
      const data = await response.json();
      return data.data || data;
    },
  });

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<TicketFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Get unassigned count
  const unassignedCount = ticketsQuery.data?.filter((t) => !t.assignedTo && t.status === "open").length || 0;

  // Get my tickets count
  const myTicketsCount = ticketsQuery.data?.filter((t) => t.assignedTo === "current-admin-id").length || 0;

  return {
    // Data
    tickets: ticketsQuery.data || [],
    selectedTicket: ticketDetailsQuery.data,
    stats: statsQuery.data,
    filters,
    unassignedCount,
    myTicketsCount,
    isLoading: ticketsQuery.isLoading,
    isLoadingDetails: ticketDetailsQuery.isLoading,

    // Selection
    selectedTicketId,
    setSelectedTicketId,

    // Actions
    createTicket: createTicket.mutate,
    isCreating: createTicket.isPending,

    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,

    updateStatus: updateStatus.mutate,
    isUpdatingStatus: updateStatus.isPending,

    updatePriority: updatePriority.mutate,
    isUpdatingPriority: updatePriority.isPending,

    assignTicket: assignTicket.mutate,
    isAssigning: assignTicket.isPending,

    addTag: addTag.mutate,
    closeTicket: closeTicket.mutate,
    isClosing: closeTicket.isPending,

    updateFilters,
    refetch: () => {
      ticketsQuery.refetch();
      statsQuery.refetch();
    },
  };
}

// Hook for user's own tickets
export function useMyTickets() {
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const response = await adminFetch("/tickets/my");
      await throwIfApiError(response, "تعذر تحميل تذاكرك");
      const data = await response.json();
      return (data.data?.tickets || data.tickets || []) as SupportTicket[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (payload: {
      subject: string;
      description: string;
      category: TicketCategory;
      relatedEntityType?: string;
      relatedEntityId?: string;
    }) => {
      const response = await adminFetch("/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await throwIfApiError(response, "فشل إنشاء التذكرة");

      return response.json();
    },
    onSuccess: () => {
      toast.success("تم إنشاء التذكرة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إنشاء التذكرة");
    },
  });

  return {
    tickets: ticketsQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    createTicket: createTicket.mutate,
    isCreating: createTicket.isPending,
    refetch: ticketsQuery.refetch,
  };
}
