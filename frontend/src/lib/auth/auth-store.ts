import { create } from 'zustand';
import { clearUserId, setUserId } from '@/lib/user-utils';

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  name?: string | null;
  avatar: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR' | 'PREMIUM';
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

  // Async Actions handled via the store or external calls
  // (Moving the complex logic here helps reduce Context size)
  reset: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
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
  }
}));

