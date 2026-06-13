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

  // Actions
  setUser: (user: AuthUser | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsRefreshing: (isRefreshing: boolean) => void;

  // Async Actions handled via the store or external calls
  // (Moving the complex logic here helps reduce Context size)
  reset: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isRefreshing: false,
  setUser: (user) => {
    if (user?.id) {
      setUserId(user.id);
    } else {
      clearUserId();
    }
    set({ user, isAuthenticated: !!user, isLoading: false });
  },
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
  reset: () => {
    set({ user: null, isAuthenticated: false, isLoading: false });
    clearUserId();
  }
}));
