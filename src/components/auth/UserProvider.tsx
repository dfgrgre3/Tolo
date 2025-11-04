'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getTokenFromStorage, removeTokenFromStorage, getUserFromStorage, saveUserToStorage } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useHydrationFix } from '@/hydration-fix';
import { setSafeAuthToken } from '@/lib/safe-client-utils';
import { setupAutoTokenRefresh } from '@/lib/token-refresh-interceptor';

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
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type');
          const isJson = contentType?.includes('application/json');
          
          if (isJson) {
            try {
              const userData = await response.json();
              setUser(userData.user);
              saveUserToStorage(userData.user);
            } catch (error) {
              console.error('Error parsing user data:', error);
              removeTokenFromStorage();
              setUser(null);
            }
          } else {
            // Response is not JSON (likely HTML error page)
            console.error('Server returned non-JSON response');
            removeTokenFromStorage();
            setUser(null);
          }
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

  // Setup automatic token refresh
  useEffect(() => {
    if (!isHydrated) return;
    
    const cleanup = setupAutoTokenRefresh(
      (newToken) => {
        // Token refreshed successfully
        if (process.env.NODE_ENV === 'development') {
          console.log('Token auto-refreshed successfully');
        }
      },
      () => {
        // Refresh failed, user should be logged out
        removeTokenFromStorage();
        setUser(null);
        router.push('/login');
      },
      5, // Refresh 5 minutes before expiration
      1  // Check every 1 minute
    );

    return cleanup;
  }, [isHydrated, router]);

  const login = useCallback((token: string, userData?: User) => {
    try {
      // Validate token
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        console.error('Invalid token provided to login function');
        toast.error('رمز المصادقة غير صالح');
        return;
      }

      // Save token using safe method
      const tokenSaved = setSafeAuthToken(token);
      if (!tokenSaved) {
        console.error('Failed to save token to storage');
        toast.error('فشل حفظ رمز المصادقة');
        return;
      }

      if (userData) {
        // Validate user data
        if (!userData.id || !userData.email) {
          console.error('Invalid user data provided:', userData);
          toast.error('بيانات المستخدم غير صحيحة');
          return;
        }

        // Save user data
        saveUserToStorage(userData);
        setUser(userData);
        
        // Show verification warnings if needed
        if (!userData.emailVerified && userData.provider === 'local') {
          toast.warning('يرجى تفعيل بريدك الإلكتروني');
        }
        if (!userData.phoneVerified && userData.phone) {
          toast.warning('يرجى تفعيل رقم هاتفك');
        }
      }
    } catch (error) {
      console.error('Error in login function:', error);
      toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      removeTokenFromStorage();
    }
    setUser(null);
    toast.success('تم تسجيل الخروج بنجاح');
    router.push('/');
  }, [router]);

  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      // Only update if there are actual changes
      const hasChanges = Object.keys(userData).some(
        key => user[key as keyof User] !== userData[key as keyof User]
      );
      
      if (hasChanges) {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        saveUserToStorage(updatedUser);
      }
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const token = getTokenFromStorage();
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        // Add cache control to prevent stale data
        cache: 'no-store',
      });

      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');
        
        if (isJson) {
          try {
            const userData = await response.json();
            // Only update if data actually changed to prevent unnecessary re-renders
            if (userData?.user) {
              setUser(userData.user);
              saveUserToStorage(userData.user);
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        } else {
          console.error('Server returned non-JSON response');
        }
      } else if (response.status === 401) {
        // Token expired, clear auth state
        removeTokenFromStorage();
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // On network errors, don't clear auth state
      // The token refresh interceptor will handle token expiration
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ user, isLoading, login, logout, updateUser, refreshUser }),
    [user, isLoading, login, logout, updateUser, refreshUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
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
