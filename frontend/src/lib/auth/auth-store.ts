import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearUserId, setUserId } from '@/lib/user-utils';


export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  name?: string | null;
  avatar: string | null;
  role: string;
  emailVerified: boolean | null;

  totalXP?: number;
  level?: number;
  permissions: string[];
  phone?: string | null;
  phoneVerified?: boolean | null;
  totalStudyTime?: number;
  tasksCompleted?: number;
  examsPassed?: number;
  pomodoroSessions?: number;
  deepWorkSessions?: number;
  studyXP?: number;
  taskXP?: number;
  examXP?: number;
  challengeXP?: number;
  questXP?: number;
  seasonXP?: number;
  currentStreak?: number;
  longestStreak?: number;
  status?: string;
  createdAt?: string | Date;
  lastLogin?: string | Date;
  school?: string | null;
  bio?: string | null;
}

type PersistedUser = Pick<AuthUser, 'id' | 'email' | 'role' | 'permissions' | 'level'>;

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user ? {
          id: state.user.id,
          email: state.user.email,
        } : null,
      })
    }
  )
);
