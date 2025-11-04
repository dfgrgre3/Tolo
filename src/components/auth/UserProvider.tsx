'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getTokenFromStorage, removeTokenFromStorage, getUserFromStorage, saveUserToStorage } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useHydrationFix } from '@/hydration-fix';
import { setSafeAuthToken } from '@/lib/safe-client-utils';

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatar?: string;
  provider?: 'local' | 'google' | 'facebook';
  twoFactorEnabled?: boolean;
  lastLogin?: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData?: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: ReactNode }) {
  const isHydrated = useHydrationFix();
  const router = useRouter();

  // Initialize with cached user data to prevent hydration mismatch
  const [user, setUser] = useState<User | null>(() => {
    // Only access localStorage on client side during initialization
    if (typeof window !== 'undefined') {
      return getUserFromStorage();
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    // Start as loading only if we have cached data that needs verification
    if (typeof window !== 'undefined') {
      return !!getTokenFromStorage();
    }
    return false;
  });

  useEffect(() => {
    // Only run authentication check after hydration to prevent hydration mismatch
    if (!isHydrated) return;

    const checkAuth = async () => {
      try {
        const token = getTokenFromStorage();

        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Try to get user from localStorage first
        const cachedUser = getUserFromStorage();
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Verify token with the server
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          saveUserToStorage(userData.user);
        } else {
          // Token is invalid, remove it
          removeTokenFromStorage();
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        removeTokenFromStorage();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isHydrated]);

  const login = (token: string, userData?: User) => {
    // Save token using safe method
    setSafeAuthToken(token);
    if (userData) {
      saveUserToStorage(userData);
      setUser(userData);
      
      // Show welcome message
      toast.success(`مرحباً ${userData.name || userData.email}!`);
        
      // Show verification warnings if needed
      if (!userData.emailVerified && userData.provider === 'local') {
        toast.warning('يرجى تفعيل بريدك الإلكتروني');
      }
      if (!userData.phoneVerified && userData.phone) {
        toast.warning('يرجى تفعيل رقم هاتفك');
      }
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      removeTokenFromStorage();
    }
    setUser(null);
    toast.success('تم تسجيل الخروج بنجاح');
    router.push('/');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      saveUserToStorage(updatedUser);
    }
  };

  const refreshUser = async () => {
    try {
      const token = getTokenFromStorage();
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        saveUserToStorage(userData.user);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
