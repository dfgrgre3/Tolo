"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { getCurrentUser, logoutUser } from "@/lib/api/auth-client";
import type { User } from "@/types/api/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const { user: fetchedUser } = await getCurrentUser();
      // Ensure we map to the correct User type structure if needed
      if (fetchedUser) {
        // @ts-ignore - mapping compatibility if types differ slightly
        setUser(fetchedUser);
      } else {
        setUser(null);
      }
    } catch (error) {
       // If 401/403, simply set user to null
       setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
    // Usually we don't need to manually fetch here if we trust the input, 
    // but fetching ensures we have the latest server state (cookies set).
    // For immediate UI feedback, we set user directly.
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
      setUser(null);
      toast.success("تم تسجيل الخروج بنجاح");
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("حدث خطأ أثناء تسجيل الخروج");
      // Force local logout anyway
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Alias for backward compatibility if needed, ensuring we catch any old usage
export const useUnifiedAuth = useAuth;
export const UnifiedAuthProvider = AuthProvider;