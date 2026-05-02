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
  status?: string;
  phone?: string | null;
  phoneVerified: boolean | null;
  alternativePhone?: string | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  city?: string | null;
  country?: string | null;
  school?: string | null;
  grade?: string | null;
  gradeLevel?: string | null;
  educationType?: string | null;
  section?: string | null;
  studyGoal?: string | null;
  bio?: string | null;
  subjectsTaught?: string[];
  experienceYears?: string | null;
  createdAt?: string;

  lastLogin?: string;
  totalXP?: number;
  level?: number;
  currentStreak?: number;
  longestStreak?: number;
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
  permissions: string[];
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
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);
