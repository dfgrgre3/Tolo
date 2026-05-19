"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-api";

export type ReportDataSource = "users" | "exams" | "courses" | "payments" | "activity" | "content";

export type ReportChartType = "table" | "bar" | "line" | "pie" | "area" | "metric";

export interface ReportFilter {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "in";
  value: string | number | string[] | { from: string | number; to: string | number };
}

export interface ReportMetric {
  name: string;
  field: string;
  aggregation: "count" | "sum" | "avg" | "min" | "max" | "distinct_count";
  format?: "number" | "currency" | "percentage" | "date";
}

export interface ReportDimension {
  field: string;
  label: string;
  format?: "date" | "text" | "number";
}

export interface ReportWidget {
  id: string;
  type: ReportChartType;
  title: string;
  dataSource: ReportDataSource;
  metrics: ReportMetric[];
  dimensions?: ReportDimension[];
  filters?: ReportFilter[];
  sort?: { field: string; direction: "asc" | "desc" };
  limit?: number;
  layout: { x: number; y: number; w: number; h: number };
}

export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  widgets: ReportWidget[];
  filters?: ReportFilter[];
  dateRange?: { from: string; to: string };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  lastRunAt?: string;
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    emailTo?: string[];
  };
}

export interface ReportExecutionResult {
  reportId: string;
  executedAt: string;
  duration: number;
  results: Record<
    string,
    {
      data: Record<string, unknown>[];
      summary?: Record<string, number>;
    }
  >;
}

export function useReportBuilder() {
  const queryClient = useQueryClient();
  const [activeReport, setActiveReport] = useState<CustomReport | null>(null);

  // Fetch all reports
  const reportsQuery = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const response = await adminFetch("/admin/reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      return (data.data?.reports || data.reports || []) as CustomReport[];
    },
  });

  // Fetch single report
  const fetchReport = useCallback(
    async (reportId: string) => {
      const response = await adminFetch(`/admin/reports/${reportId}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      const data = await response.json();
      return (data.data?.report || data.report) as CustomReport;
    },
    []
  );

  // Create report
  const createReport = useMutation({
    mutationFn: async (payload: Omit<CustomReport, "id" | "createdBy" | "createdAt" | "updatedAt">) => {
      const response = await adminFetch("/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create report");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("تم إنشاء التقرير بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      setActiveReport(data.data?.report || data.report);
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في إنشاء التقرير");
    },
  });

  // Update report
  const updateReport = useMutation({
    mutationFn: async ({ reportId, updates }: { reportId: string; updates: Partial<CustomReport> }) => {
      const response = await adminFetch(`/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update report");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success("تم تحديث التقرير");
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      if (activeReport?.id === variables.reportId) {
        setActiveReport(data.data?.report || data.report);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في تحديث التقرير");
    },
  });

  // Delete report
  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await adminFetch(`/admin/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete report");
      return response.json();
    },
    onSuccess: (_, reportId) => {
      toast.success("تم حذف التقرير");
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      if (activeReport?.id === reportId) {
        setActiveReport(null);
      }
    },
    onError: () => {
      toast.error("فشل في حذف التقرير");
    },
  });

  // Execute report
  const executeReport = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await adminFetch(`/admin/reports/${reportId}/execute`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to execute report");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("تم تنفيذ التقرير بنجاح");
      return data.data?.result as ReportExecutionResult;
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل في تنفيذ التقرير");
    },
  });

  // Export report
  const exportReport = useMutation({
    mutationFn: async ({ reportId, format }: { reportId: string; format: "pdf" | "excel" | "csv" }) => {
      const response = await adminFetch(`/admin/reports/${reportId}/export?format=${format}`, {
        method: "GET",
      });

      if (!response.ok) throw new Error("Export failed");
      return response.blob();
    },
    onSuccess: (blob, { format }) => {
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`تم تصدير التقرير بصيغة ${format.toUpperCase()}`);
    },
    onError: () => {
      toast.error("فشل في تصدير التقرير");
    },
  });

  // Schedule report
  const scheduleReport = useMutation({
    mutationFn: async ({
      reportId,
      schedule,
    }: {
      reportId: string;
      schedule: { frequency: "daily" | "weekly" | "monthly"; emailTo: string[] };
    }) => {
      const response = await adminFetch(`/admin/reports/${reportId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });

      if (!response.ok) throw new Error("Failed to schedule report");
      return response.json();
    },
    onSuccess: () => {
      toast.success("تم جدولة التقرير");
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: () => {
      toast.error("فشل في جدولة التقرير");
    },
  });

  // Get available fields for a data source
  const getAvailableFields = useCallback((dataSource: ReportDataSource) => {
    const fields: Record<ReportDataSource, { value: string; label: string; type: "string" | "number" | "date" | "boolean" }[]> = {
      users: [
        { value: "id", label: "معرف المستخدم", type: "string" },
        { value: "name", label: "الاسم", type: "string" },
        { value: "email", label: "البريد الإلكتروني", type: "string" },
        { value: "role", label: "الدور", type: "string" },
        { value: "created_at", label: "تاريخ الإنشاء", type: "date" },
        { value: "last_login", label: "آخر تسجيل دخول", type: "date" },
        { value: "is_active", label: "نشط", type: "boolean" },
      ],
      exams: [
        { value: "id", label: "معرف الاختبار", type: "string" },
        { value: "title", label: "العنوان", type: "string" },
        { value: "subject_id", label: "معرف المادة", type: "string" },
        { value: "duration", label: "المدة", type: "number" },
        { value: "total_questions", label: "عدد الأسئلة", type: "number" },
        { value: "passing_score", label: "درجة النجاح", type: "number" },
        { value: "created_at", label: "تاريخ الإنشاء", type: "date" },
      ],
      courses: [
        { value: "id", label: "معرف الدورة", type: "string" },
        { value: "title", label: "العنوان", type: "string" },
        { value: "enrolled_count", label: "عدد المسجلين", type: "number" },
        { value: "completion_rate", label: "معدل الإكمال", type: "number" },
        { value: "avg_rating", label: "متوسط التقييم", type: "number" },
      ],
      payments: [
        { value: "id", label: "معرف الدفعة", type: "string" },
        { value: "amount", label: "المبلغ", type: "number" },
        { value: "currency", label: "العملة", type: "string" },
        { value: "status", label: "الحالة", type: "string" },
        { value: "created_at", label: "تاريخ الدفع", type: "date" },
      ],
      activity: [
        { value: "user_id", label: "معرف المستخدم", type: "string" },
        { value: "action", label: "الإجراء", type: "string" },
        { value: "page", label: "الصفحة", type: "string" },
        { value: "timestamp", label: "الوقت", type: "date" },
        { value: "session_duration", label: "مدة الجلسة", type: "number" },
      ],
      content: [
        { value: "id", label: "المعرف", type: "string" },
        { value: "type", label: "النوع", type: "string" },
        { value: "title", label: "العنوان", type: "string" },
        { value: "views", label: "المشاهدات", type: "number" },
        { value: "likes", label: "الإعجابات", type: "number" },
        { value: "created_at", label: "تاريخ النشر", type: "date" },
      ],
    };

    return fields[dataSource] || [];
  }, []);

  return {
    // Data
    reports: reportsQuery.data || [],
    activeReport,
    isLoading: reportsQuery.isLoading,

    // Actions
    setActiveReport,
    fetchReport,

    createReport: createReport.mutate,
    createReportAsync: createReport.mutateAsync,
    isCreating: createReport.isPending,

    updateReport: updateReport.mutate,
    isUpdating: updateReport.isPending,

    deleteReport: deleteReport.mutate,
    isDeleting: deleteReport.isPending,

    executeReport: executeReport.mutate,
    executeReportAsync: executeReport.mutateAsync,
    isExecuting: executeReport.isPending,

    exportReport: exportReport.mutate,
    isExporting: exportReport.isPending,

    scheduleReport: scheduleReport.mutate,
    isScheduling: scheduleReport.isPending,

    getAvailableFields,
    refetch: reportsQuery.refetch,
  };
}

// Pre-built report templates
export const REPORT_TEMPLATES = {
  userGrowth: {
    name: "نمو المستخدمين",
    description: "تحليل نمو المستخدمين عبر الوقت",
    widgets: [
      {
        id: "new-users-metric",
        type: "metric",
        title: "مستخدمين جدد",
        dataSource: "users" as ReportDataSource,
        metrics: [{ name: "new_users", field: "id", aggregation: "count" }],
        layout: { x: 0, y: 0, w: 3, h: 2 },
      },
      {
        id: "growth-chart",
        type: "line",
        title: "معدل النمو",
        dataSource: "users" as ReportDataSource,
        dimensions: [{ field: "created_at", label: "التاريخ", format: "date" }],
        metrics: [{ name: "count", field: "id", aggregation: "count" }],
        layout: { x: 3, y: 0, w: 9, h: 4 },
      },
    ],
  },
  examPerformance: {
    name: "أداء الاختبارات",
    description: "تحليل أداء الطلاب في الاختبارات",
    widgets: [
      {
        id: "avg-score",
        type: "metric",
        title: "متوسط الدرجات",
        dataSource: "exams" as ReportDataSource,
        metrics: [{ name: "avg_score", field: "score", aggregation: "avg", format: "percentage" }],
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: "pass-rate",
        type: "metric",
        title: "معدل النجاح",
        dataSource: "exams" as ReportDataSource,
        metrics: [{ name: "pass_rate", field: "passed", aggregation: "avg", format: "percentage" }],
        layout: { x: 4, y: 0, w: 4, h: 2 },
      },
    ],
  },
  revenueReport: {
    name: "التقرير المالي",
    description: "تحليل الإيرادات والمدفوعات",
    widgets: [
      {
        id: "total-revenue",
        type: "metric",
        title: "إجمالي الإيرادات",
        dataSource: "payments" as ReportDataSource,
        metrics: [{ name: "revenue", field: "amount", aggregation: "sum", format: "currency" }],
        layout: { x: 0, y: 0, w: 6, h: 2 },
      },
      {
        id: "revenue-chart",
        type: "bar",
        title: "الإيرادات الشهرية",
        dataSource: "payments" as ReportDataSource,
        dimensions: [{ field: "created_at", label: "الشهر", format: "date" }],
        metrics: [{ name: "revenue", field: "amount", aggregation: "sum", format: "currency" }],
        layout: { x: 0, y: 2, w: 12, h: 4 },
      },
    ],
  },
};
