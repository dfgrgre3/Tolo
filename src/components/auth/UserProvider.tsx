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

        // Verify token with the server (with timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        let response: Response;
        try {
          response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            signal: controller.signal,
            cache: 'no-store',
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            console.warn('Auth check request timed out');
            removeTokenFromStorage();
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // Network error - don't clear token, might be temporary
          if (
            fetchError.message?.includes('Failed to fetch') ||
            !navigator.onLine
          ) {
            console.warn('Network error during auth check, keeping cached user');
            setIsLoading(false);
            return;
          }
          
          // Other errors - clear auth state
          console.error('Error during auth check:', fetchError);
          removeTokenFromStorage();
          setUser(null);
          setIsLoading(false);
          return;
        }

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

      // Validate token format (basic JWT check)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        toast.error('تنسيق رمز المصادقة غير صحيح');
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

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          console.error('Invalid email format in user data');
          toast.error('تنسيق البريد الإلكتروني غير صحيح');
          return;
        }

        // Save user data
        saveUserToStorage(userData);
        setUser(userData);
        
        // Show verification warnings if needed (non-blocking)
        if (!userData.emailVerified && userData.provider === 'local') {
          toast.warning('يرجى تفعيل بريدك الإلكتروني', { duration: 5000 });
        }
        if (!userData.phoneVerified && userData.phone) {
          toast.warning('يرجى تفعيل رقم هاتفك', { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('Error in login function:', error);
      toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
      
      // Try to clean up on error
      try {
        removeTokenFromStorage();
        setUser(null);
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Try to call logout API (non-blocking)
      if (typeof window !== 'undefined') {
        const token = getTokenFromStorage();
        if (token) {
          try {
            // Call logout endpoint but don't wait for it
            fetch('/api/auth/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              credentials: 'include',
            }).catch((error) => {
              // Silently fail - we'll clear local state anyway
              if (process.env.NODE_ENV === 'development') {
                console.warn('Logout API call failed:', error);
              }
            });
          } catch (error) {
            // Silently fail
            if (process.env.NODE_ENV === 'development') {
              console.warn('Error calling logout API:', error);
            }
          }
        }
        
        // Clear local storage regardless of API call result
        removeTokenFromStorage();
      }
      
      setUser(null);
      setIsLoading(false);
      toast.success('تم تسجيل الخروج بنجاح');
      
      // Navigate to home page
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, clear local state
      if (typeof window !== 'undefined') {
        removeTokenFromStorage();
      }
      setUser(null);
      setIsLoading(false);
      router.push('/');
    }
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
      if (!token) {
        return;
      }

      // Validate token format before making request
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.warn('Invalid token format, clearing auth state');
        removeTokenFromStorage();
        setUser(null);
        return;
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          // Add cache control to prevent stale data
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type');
          const isJson = contentType?.includes('application/json');
          
          if (isJson) {
            try {
              const userData = await response.json();
              // Only update if data actually changed to prevent unnecessary re-renders
              if (userData?.user) {
                // Validate user data structure
                if (!userData.user.id || !userData.user.email) {
                  console.error('Invalid user data structure received');
                  return;
                }
                
                // Deep comparison to prevent unnecessary updates
                const currentUserStr = JSON.stringify(user);
                const newUserStr = JSON.stringify(userData.user);
                
                if (currentUserStr !== newUserStr) {
                  setUser(userData.user);
                  saveUserToStorage(userData.user);
                }
              } else {
                console.warn('No user data in response');
              }
            } catch (error) {
              console.error('Error parsing user data:', error);
              // Don't clear auth state on parse error, might be temporary
            }
          } else {
            console.error('Server returned non-JSON response');
            // Don't clear auth state, might be temporary issue
          }
        } else if (response.status === 401) {
          // Token expired or invalid, clear auth state
          console.warn('Token expired or invalid, clearing auth state');
          removeTokenFromStorage();
          setUser(null);
        } else if (response.status === 403) {
          // Forbidden - might be temporary, don't clear auth state
          console.warn('Forbidden access while refreshing user');
        } else if (response.status >= 500) {
          // Server error - don't clear auth state, just log
          console.warn('Server error while refreshing user:', response.status);
        } else {
          // Other errors - log but don't clear auth state
          console.warn('Unexpected status while refreshing user:', response.status);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout errors
        if (fetchError.name === 'AbortError') {
          console.warn('User refresh request timed out');
          // Don't clear auth state on timeout, might be network issue
          return;
        }
        
        // Handle network errors
        if (
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          console.warn('Network error while refreshing user:', fetchError);
          // Don't clear auth state on network errors
          return;
        }
        
        console.error('Error refreshing user data:', fetchError);
        // Don't clear auth state on unexpected errors
      }
    } catch (error) {
      console.error('Unexpected error in refreshUser:', error);
      // On unexpected errors, don't clear auth state
      // The token refresh interceptor will handle token expiration
    }
  }, [user]);

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
