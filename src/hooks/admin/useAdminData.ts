"use client";

import * as React from "react";
import { toast } from "sonner";
import { logger } from '@/lib/logger';
import { apiClient } from "@/lib/api/api-client";

// Types
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function normalizePaginatedResponse<T>(payload: any): PaginatedResponse<T> {
  const data = payload?.data ?? payload ?? {};
  const pagination = data?.pagination ?? payload?.pagination ?? {};

  const items =
    data?.items ??
    data?.users ??
    data?.subjects ??
    data?.courses ??
    data?.exams ??
    data?.categories ??
    data?.teachers ??
    payload?.items ??
    [];

  return {
    items: Array.isArray(items) ? items : [],
    total: pagination?.total ?? pagination?.totalCount ?? 0,
    page: pagination?.page ?? 1,
    pageSize: pagination?.limit ?? pagination?.pageSize ?? 10,
    totalPages: pagination?.totalPages ?? pagination?.pages ?? 1,
  };
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Generic hook for fetching admin data
export function useAdminFetch<T>(
  endpoint: string,
  options?: {
    autoFetch?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
) {
  const [state, setState] = React.useState<FetchState<T>>({
    data: null,
    loading: options?.autoFetch !== false,
    error: null,
  });

  const fetchData = React.useCallback(
    async (params?: Record<string, string | number | boolean>) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const searchParams = new URLSearchParams();
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              searchParams.append(key, String(value));
            }
          });
        }

        const url = `${endpoint}${searchParams.toString() ? `?${searchParams}` : ""}`;
        const data = await apiClient.get<T>(url);

        setState({ data, loading: false, error: null });
        options?.onSuccess?.(data);
        return data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "حدث خطأ غير متوقع";
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        options?.onError?.(errorMessage);
        toast.error(errorMessage);
        return null;
      }
    },
    [endpoint, options]
  );

  const reset = React.useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    fetchData,
    reset,
    refetch: () => fetchData(),
  };
}

// Hook for paginated data
export function useAdminPaginated<T>(
  endpoint: string,
  initialParams?: PaginationParams
) {
  const [params, setParams] = React.useState<PaginationParams>(
    initialParams || { page: 1, pageSize: 10 }
  );
  const [state, setState] = React.useState<FetchState<PaginatedResponse<T>>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", String(params.page));
      if (params.pageSize) searchParams.append("pageSize", String(params.pageSize));
      if (params.search) searchParams.append("search", params.search);
      if (params.sortBy) searchParams.append("sortBy", params.sortBy);
      if (params.sortOrder) searchParams.append("sortOrder", params.sortOrder);

      const rawData = await apiClient.get<any>(`${endpoint}?${searchParams}`);
      const data = normalizePaginatedResponse<T>(rawData);

      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(errorMessage);
    }
  }, [endpoint, params]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPage = React.useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = React.useCallback((pageSize: number) => {
    setParams((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSearch = React.useCallback((search: string) => {
    setParams((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setSorting = React.useCallback(
    (sortBy: string, sortOrder: "asc" | "desc") => {
      setParams((prev) => ({ ...prev, sortBy, sortOrder }));
    },
    []
  );

  return {
    ...state,
    params,
    setPage,
    setPageSize,
    setSearch,
    setSorting,
    refetch: fetchData,
    items: state.data?.items ?? [],
    total: state.data?.total ?? 0,
    totalPages: state.data?.totalPages ?? 0,
  };
}

// Hook for CRUD operations
export function useAdminCrud<T extends { id: string }>(
  endpoint: string,
  options?: {
    onSuccess?: (action: "create" | "update" | "delete", data?: T) => void;
    onError?: (action: "create" | "update" | "delete", error: string) => void;
  }
) {
  const [loading, setLoading] = React.useState(false);
  const create = React.useCallback(
    async (data: Partial<T>): Promise<T | null> => {
      setLoading(true);
      try {
        const result = await apiClient.post<T>(endpoint, data);
        toast.success("تم الإنشاء بنجاح");
        options?.onSuccess?.("create", result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "حدث خطأ غير متوقع";
        toast.error(errorMessage);
        options?.onError?.("create", errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, options]
  );

  const update = React.useCallback(
    async (id: string, data: Partial<T>): Promise<T | null> => {
      setLoading(true);
      try {
        const result = await apiClient.patch<T>(endpoint, { id, ...data });
        toast.success("تم التحديث بنجاح");
        options?.onSuccess?.("update", result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "حدث خطأ غير متوقع";
        toast.error(errorMessage);
        options?.onError?.("update", errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, options]
  );

  const remove = React.useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        await apiClient.delete(endpoint, { body: JSON.stringify({ id }) });
        toast.success("تم الحذف بنجاح");
        options?.onSuccess?.("delete");
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "حدث خطأ غير متوقع";
        toast.error(errorMessage);
        options?.onError?.("delete", errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, options]
  );

  const bulkDelete = React.useCallback(
    async (ids: string[]): Promise<number> => {
      setLoading(true);
      let deletedCount = 0;
      try {
        for (const id of ids) {
          try {
            await apiClient.delete(endpoint, { body: JSON.stringify({ id }) });
            deletedCount++;
          } catch (e) {
            logger.error(`Failed to delete item ${id}:`, e);
          }
        }

        if (deletedCount > 0) {
          toast.success(`تم حذف ${deletedCount} عنصر بنجاح`);
          options?.onSuccess?.("delete");
        }
        return deletedCount;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "حدث خطأ غير متوقع";
        toast.error(errorMessage);
        options?.onError?.("delete", errorMessage);
        return deletedCount;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, options]
  );

  return {
    loading,
    create,
    update,
    remove,
    bulkDelete,
  };
}

// Hook for single item fetch
export function useAdminItem<T>(
  endpoint: string,
  id: string | null,
  options?: {
    autoFetch?: boolean;
  }
) {
  const [state, setState] = React.useState<FetchState<T>>({
    data: null,
    loading: options?.autoFetch !== false && !!id,
    error: null,
  });

  const fetchItem = React.useCallback(async () => {
    if (!id) return null;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiClient.get<T>(`${endpoint}/${id}`);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(errorMessage);
      return null;
    }
  }, [endpoint, id]);

  React.useEffect(() => {
    if (id && options?.autoFetch !== false) {
      fetchItem();
    }
  }, [id, fetchItem, options?.autoFetch]);

  return {
    ...state,
    fetchItem,
    refetch: fetchItem,
  };
}

interface DashboardStats {
  users: { total: number; new: number; active: number };
  content: { subjects: number; exams: number; resources: number };
  activity: { studySessions: number; tasksCompleted: number };
  gamification: { totalXP: number; achievements: number };
}

// Hook for dashboard stats
export function useAdminDashboard() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<DashboardStats>("/admin/dashboard");
      setStats(data);
    } catch (error) {
      logger.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
