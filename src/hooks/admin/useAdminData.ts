"use client";

import * as React from "react";
import { toast } from "sonner";

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
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "حدث خطأ أثناء جلب البيانات");
        }

        const data = await response.json();
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

      const response = await fetch(`${endpoint}?${searchParams}`);

      if (!response.ok) {
        throw new Error("حدث خطأ أثناء جلب البيانات");
      }

      const data = await response.json();
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
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "حدث خطأ أثناء الإنشاء");
        }

        const result = await response.json();
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
        const response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...data }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "حدث خطأ أثناء التحديث");
        }

        const result = await response.json();
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
        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "حدث خطأ أثناء الحذف");
        }

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
          const response = await fetch(endpoint, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          if (response.ok) deletedCount++;
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
      const response = await fetch(`${endpoint}/${id}`);

      if (!response.ok) {
        throw new Error("العنصر غير موجود");
      }

      const data = await response.json();
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

// Hook for dashboard stats
export function useAdminDashboard() {
  const [stats, setStats] = React.useState<{
    users: { total: number; new: number; active: number };
    content: { subjects: number; exams: number; resources: number };
    activity: { studySessions: number; tasksCompleted: number };
    gamification: { totalXP: number; achievements: number };
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
