import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearUserId, setUserId } from '@/lib/user-utils';
import { UserRole } from './roles';

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  name?: string | null;
  avatar: string | null;
  role: UserRole;
  emailVerified: boolean | null;
  permissions: string[];
  phone?: string | null;
  phoneVerified?: boolean | null;
  status?: string;
  createdAt?: string | Date;
  lastLogin?: string | Date;
  school?: string | null;
  bio?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  /** Timestamp of the last successful profile sync (epoch ms) */
  lastRefreshedAt: number | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsRefreshing: (isRefreshing: boolean) => void;
  setLastRefreshed: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isRefreshing: false,
      lastRefreshedAt: null,
      setUser: (user) => {
        if (user?.id) {
          setUserId(user.id);
        } else {
          clearUserId();
        }
        set({ user, isAuthenticated: !!user, isLoading: false, lastRefreshedAt: Date.now() });
      },
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
      setLastRefreshed: () => set({ lastRefreshedAt: Date.now() }),
      reset: () => {
        set({ user: null, isAuthenticated: false, isLoading: false, lastRefreshedAt: null });
        clearUserId();
      },
    }),
    {
      name: 'tolo-auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastRefreshedAt: state.lastRefreshedAt,
      }),
      migrate: (persistedState, version) => {
        // Version 0 → 1: Initial migration when "version: 1" was introduced.
        // Previously no migrate function existed, so the stored data uses the
        // old shape (no version field). We cast it to the current AuthState.
        if (version === 0) {
          const old = persistedState as Record<string, unknown>;
          return {
            user: old.user ?? null,
            isAuthenticated: old.isAuthenticated ?? !!old.user,
            lastRefreshedAt: old.lastRefreshedAt ?? null,
          } as Partial<AuthState>;
        }
        // For future versions, accept as-is
        return persistedState as Partial<AuthState>;
      },
      // Bump this version when AuthUser interface changes to force cache invalidation
      version: 1,
    }
  )
);

export function setClientCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof window === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function deleteClientCookie(name: string) {
  if (typeof window === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
}