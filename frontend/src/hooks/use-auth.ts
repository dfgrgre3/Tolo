"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, ApiError } from "@/lib/api/api-client";

export interface AuthUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatar: string | null;
  role: string;
  permissions: string[];
  phone: string | null;
  school: string | null;
  bio: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status?: string;
  createdAt: string | null;
  lastLogin: string | null;

  // Profile fields
  alternativePhone?: string | null;
  dateOfBirth?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  gradeLevel?: string | null;
  educationType?: string | null;
  section?: string | null;
  studyGoal?: string | null;
  subjectsTaught?: string[];
  experienceYears?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });
  const fetchRef = useRef<AbortController | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    // Abort any existing request
    if (fetchRef.current) {
      fetchRef.current.abort();
    }

    const controller = new AbortController();
    fetchRef.current = controller;

    const fetchUser = async () => {
      try {
        const data = await apiClient.get<any>('/auth/me', {
          signal: controller.signal,
        });

        const userData: AuthUser = data?.user || data;
        setState({
          user: userData,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return; // Ignore aborted requests
        }
        const is401 = err instanceof ApiError && err.status === 401;
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: is401 ? null : 'Network error',
        });
      }
    };

    fetchUser();

    return () => {
      controller.abort();
    };
  }, []);

  const login = useCallback(async () => {
    window.location.href = "/login";
  }, []);

  const register = useCallback(async () => {
    window.location.href = "/register";
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors
    }
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
    window.location.href = "/login";
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/auth/me');
      const userData: AuthUser = data?.user || data;
      setState({
        user: userData,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const endpoint = typeof input === 'string' ? input : input.toString();
      return apiClient.fetch(endpoint, init);
    },
    []
  );

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    fetchWithAuth,
  };
}