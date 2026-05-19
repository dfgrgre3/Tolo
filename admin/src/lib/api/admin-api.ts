import { apiClient } from "./api-client";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue> | URLSearchParams;

function normalizeAdminEndpoint(endpoint: string): string {
  if (endpoint.startsWith("/api/admin/")) {
    return endpoint;
  }
  if (endpoint.startsWith("/admin/")) {
    return endpoint;
  }
  return `/admin/${endpoint.replace(/^\/+/, "")}`;
}

function withQuery(endpoint: string, query?: QueryParams): string {
  if (!query) return endpoint;

  const params = query instanceof URLSearchParams ? query : new URLSearchParams();
  if (!(query instanceof URLSearchParams)) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  }

  const qs = params.toString();
  if (!qs) return endpoint;
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${qs}`;
}

export const adminApi = {
  endpoint(endpoint: string, query?: QueryParams) {
    return withQuery(normalizeAdminEndpoint(endpoint), query);
  },

  fetch(endpoint: string, options?: RequestInit) {
    return apiClient.fetch(normalizeAdminEndpoint(endpoint), options);
  },

  get<T>(endpoint: string, query?: QueryParams) {
    return apiClient.get<T>(withQuery(normalizeAdminEndpoint(endpoint), query));
  },

  post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return apiClient.post<T>(normalizeAdminEndpoint(endpoint), body, options);
  },

  patch<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return apiClient.patch<T>(normalizeAdminEndpoint(endpoint), body, options);
  },

  put<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return apiClient.put<T>(normalizeAdminEndpoint(endpoint), body, options);
  },

  delete<T>(endpoint: string, options?: RequestInit) {
    return apiClient.delete<T>(normalizeAdminEndpoint(endpoint), options);
  },
};

export const adminFetch = adminApi.fetch;
