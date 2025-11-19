'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { removeTokenFromStorage, getUserFromStorage, saveUserToStorage } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useHydrationFix } from '@/hydration-fix';
// Token is in httpOnly cookie - no need to import setSafeAuthToken
import { setupAutoTokenRefresh } from '@/lib/token-refresh-interceptor';

import { logger } from '@/lib/logger';

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
  _isProviderMounted?: boolean; // Internal flag to check if provider is mounted
}

// Create context with default value to prevent React errors when used outside provider
// This ensures useAuth never throws, even if called before AuthProvider is mounted
const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  user: null,
  isLoading: false,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  refreshUser: async () => {},
  _isProviderMounted: false
};

// Create context with explicit default value
// IMPORTANT: The default value ensures useContext never throws, even when used outside provider
const AuthContext = createContext<AuthContextType>(DEFAULT_AUTH_CONTEXT);

// Export both context and default for safety
export { AuthContext, DEFAULT_AUTH_CONTEXT };

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
    // Start as loading only if we have cached user data that needs verification
    // Note: Token is in httpOnly cookie, not localStorage
    if (typeof window !== 'undefined') {
      return !!getUserFromStorage();
    }
    return false;
  });

  useEffect(() => {
    // Only run authentication check after hydration to prevent hydration mismatch
    if (!isHydrated) return;

    const checkAuth = async () => {
      try {
        // Try to get user from localStorage first (for faster initial render)
        // Note: Token is stored in httpOnly cookie, not localStorage
        const cachedUser = getUserFromStorage();
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Always check with server - token is in httpOnly cookie
        // The server will read from cookies automatically
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 10000); // 10 second timeout
        
        let response: Response;
        try {
          // Don't send Authorization header - rely on httpOnly cookies only
          // This ensures we use the secure cookie-based authentication
          const fetchPromise = fetch('/api/auth/me', {
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Important: include cookies in request
            signal: controller.signal,
            cache: 'no-store',
          });

          // Additional timeout protection using Promise.race
          const timeoutPromise = new Promise<Response>((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Request timeout'));
            }, 10000);
          });

          response = await Promise.race([fetchPromise, timeoutPromise]);
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
            logger.warn('Auth check request timed out');
            removeTokenFromStorage(); // Clean up any legacy tokens
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // Network error - don't clear user, might be temporary
          if (
            fetchError.message?.includes('Failed to fetch') ||
            fetchError.message?.includes('NetworkError') ||
            (typeof navigator !== 'undefined' && !navigator.onLine)
          ) {
            logger.warn('Network error during auth check, keeping cached user');
            setIsLoading(false);
            return;
          }
          
          // Other errors - clear auth state
          logger.error('Error during auth check:', fetchError);
          removeTokenFromStorage(); // Clean up any legacy tokens
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
              // Parse response with timeout protection
              const parsePromise = response.json();
              const parseTimeoutPromise = new Promise<never>((resolve, reject) => {
                setTimeout(() => reject(new Error('JSON parsing timeout')), 5000);
              });

              const userData = await Promise.race([parsePromise, parseTimeoutPromise]);
              
              // Validate user data structure
              if (!userData || typeof userData !== 'object') {
                throw new Error('Invalid user data structure');
              }

              if (!userData.user || typeof userData.user !== 'object') {
                throw new Error('User object missing or invalid');
              }

              // Validate required user fields
              if (!userData.user.id || typeof userData.user.id !== 'string') {
                throw new Error('User ID missing or invalid');
              }

              if (!userData.user.email || typeof userData.user.email !== 'string') {
                throw new Error('User email missing or invalid');
              }

              setUser(userData.user);
              saveUserToStorage(userData.user);
              // Token is in httpOnly cookie - no need to store in localStorage
            } catch (error) {
              logger.error('Error parsing user data:', error);
              removeTokenFromStorage(); // Clean up any legacy tokens
              setUser(null);
            }
          } else {
            // Response is not JSON (likely HTML error page)
            logger.error('Server returned non-JSON response');
            removeTokenFromStorage(); // Clean up any legacy tokens
            setUser(null);
          }
        } else {
          // Authentication failed - clear state
          // Check status code for better error handling
          if (response.status === 401 || response.status === 403) {
            logger.info('Authentication failed: unauthorized');
          } else if (response.status >= 500) {
            logger.error('Server error during auth check');
            // Don't clear user on server errors - might be temporary
            setIsLoading(false);
            return;
          }
          
          removeTokenFromStorage(); // Clean up any legacy tokens
          setUser(null);
        }
      } catch (error) {
        logger.error('Authentication error:', error);
        removeTokenFromStorage(); // Clean up any legacy tokens
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
          logger.info('Token auto-refreshed successfully');
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
      // Note: Token is already stored in httpOnly cookie by server
      // We don't need to save token to localStorage for security
      // Just validate token format for logging purposes
      if (token && typeof token === 'string' && token.trim().length > 0) {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          logger.warn('Invalid token format received (token is in cookie, this is just validation)');
        }
      }

      if (userData) {
        // Validate user data
        if (!userData.id || !userData.email) {
          logger.error('Invalid user data provided:', userData);
          toast.error('بيانات المستخدم غير صحيحة');
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          logger.error('Invalid email format in user data');
          toast.error('تنسيق البريد الإلكتروني غير صحيح');
          return;
        }

        // Save user data to localStorage for faster initial render
        // Token is in httpOnly cookie - no need to store in localStorage
        saveUserToStorage(userData);
        setUser(userData);
        
        // Show welcome message
        toast.success(`مرحباً ${userData.name || userData.email}! تم تسجيل الدخول بنجاح`, { 
          duration: 4000,
          description: 'يمكنك الآن الوصول إلى جميع الميزات'
        });
        
        // Show verification warnings if needed (non-blocking)
        if (!userData.emailVerified && userData.provider === 'local') {
          toast.warning('يرجى تفعيل بريدك الإلكتروني', { duration: 5000 });
        }
        if (!userData.phoneVerified && userData.phone) {
          toast.warning('يرجى تفعيل رقم هاتفك', { duration: 5000 });
        }
      }
    } catch (error) {
      logger.error('Error in login function:', error);
      toast.error('حدث خطأ أثناء حفظ بيانات تسجيل الدخول');
      
      // Try to clean up on error
      try {
        removeTokenFromStorage(); // Clean up any legacy tokens
        setUser(null);
      } catch (cleanupError) {
        logger.error('Error during cleanup:', cleanupError);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Try to call logout API (non-blocking)
      if (typeof window !== 'undefined') {
        try {
          // Token is in httpOnly cookie - no need to send Authorization header
          // Call logout endpoint but don't wait for it
          fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          }).catch((error) => {
            // Silently fail - we'll clear local state anyway
            if (process.env.NODE_ENV === 'development') {
              logger.warn('Logout API call failed:', error);
            }
          });
        } catch (error) {
          // Silently fail
          if (process.env.NODE_ENV === 'development') {
            logger.warn('Error calling logout API:', error);
          }
        }
        
        // Clear local storage regardless of API call result
        // Clean up any legacy tokens from localStorage
        removeTokenFromStorage();
      }
      
      setUser(null);
      setIsLoading(false);
      toast.success('تم تسجيل الخروج بنجاح');
      
      // Navigate to home page
      router.push('/');
    } catch (error) {
      logger.error('Error during logout:', error);
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
      // Token is in httpOnly cookie - no need to check localStorage
      // Always check with server - server will read from cookies

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        // Don't send Authorization header - rely on httpOnly cookies only
        // This ensures we use the secure cookie-based authentication
        const response = await fetch('/api/auth/me', {
          headers: {
            'Content-Type': 'application/json',
          },
          // Add cache control to prevent stale data
          cache: 'no-store',
          credentials: 'include', // Important: include cookies in request
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
                  logger.error('Invalid user data structure received');
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
                logger.warn('No user data in response');
              }
            } catch (error) {
              logger.error('Error parsing user data:', error);
              // Don't clear auth state on parse error, might be temporary
            }
          } else {
            logger.error('Server returned non-JSON response');
            // Don't clear auth state, might be temporary issue
          }
        } else if (response.status === 401) {
          // Token expired or invalid, clear auth state
          logger.warn('Token expired or invalid, clearing auth state');
          removeTokenFromStorage(); // Clean up any legacy tokens
          setUser(null);
        } else if (response.status === 403) {
          // Forbidden - might be temporary, don't clear auth state
          logger.warn('Forbidden access while refreshing user');
        } else if (response.status >= 500) {
          // Server error - don't clear auth state, just log
          logger.warn('Server error while refreshing user:', response.status);
        } else {
          // Other errors - log but don't clear auth state
          logger.warn('Unexpected status while refreshing user:', response.status);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout errors
        if (fetchError.name === 'AbortError') {
          logger.warn('User refresh request timed out');
          // Don't clear auth state on timeout, might be network issue
          return;
        }
        
        // Handle network errors
        if (
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('NetworkError') ||
          !navigator.onLine
        ) {
          logger.warn('Network error while refreshing user:', fetchError);
          // Don't clear auth state on network errors
          return;
        }
        
        logger.error('Error refreshing user data:', fetchError);
        // Don't clear auth state on unexpected errors
      }
    } catch (error) {
      logger.error('Unexpected error in refreshUser:', error);
      // On unexpected errors, don't clear auth state
      // The token refresh interceptor will handle token expiration
    }
  }, [user]);

  // Memoize context value to prevent unnecessary re-renders
  // Always include _isProviderMounted: true to ensure useAuth works correctly
  const contextValue = useMemo(
    () => ({ 
      user, 
      isLoading, 
      login, 
      logout, 
      updateUser, 
      refreshUser,
      _isProviderMounted: true // Mark that provider is mounted - always true when provider is rendered
    }),
    [user, isLoading, login, logout, updateUser, refreshUser]
  );

  // Always render the provider - contextValue is always available
  // This ensures useAuth can always access the context, even during SSR
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook - safely gets auth context
 * 
 * IMPORTANT: This hook NEVER throws an error. It always returns a safe default context
 * if the AuthProvider is not available (e.g., during SSR or initial render).
 * 
 * React's useContext will return DEFAULT_AUTH_CONTEXT if no Provider is found,
 * so we never need to throw an error.
 */
export function useAuth(): AuthContextType {
  // React's useContext will return DEFAULT_AUTH_CONTEXT if no Provider is mounted
  // This means it will NEVER throw an error when we provide a default value
  // We use a try-catch for extra safety in edge cases, but it should never be needed
  let context: AuthContextType;
  
  try {
    // Safely get context - React will return DEFAULT_AUTH_CONTEXT if no provider exists
    context = useContext(AuthContext);
    
    // Ensure context is always defined (should never be null/undefined with default value)
    if (!context) {
      context = DEFAULT_AUTH_CONTEXT;
    }
  } catch (error) {
    // If useContext somehow throws (should never happen with default value),
    // return default context immediately
    if (process.env.NODE_ENV === 'development') {
      console.warn('useAuth: useContext threw an error (unexpected), using default context:', error);
    }
    context = DEFAULT_AUTH_CONTEXT;
  }
  
  // Always ensure we have a valid context object
  if (!context || typeof context !== 'object') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('useAuth: context is invalid, using default context');
    }
    context = DEFAULT_AUTH_CONTEXT;
  }
  
  // Check if we're inside the provider by checking the internal flag
  // If _isProviderMounted is not true, we're using the default context
  if (context._isProviderMounted !== true) {
    // Provider is not mounted - return default context (no error thrown)
    // This is EXPECTED during SSR or initial render
    const { _isProviderMounted, ...defaultContext } = DEFAULT_AUTH_CONTEXT;
    return defaultContext as AuthContextType;
  }
  
  // Provider is mounted - remove the internal flag and return public context
  const { _isProviderMounted, ...publicContext } = context;
  return publicContext as AuthContextType;
}
