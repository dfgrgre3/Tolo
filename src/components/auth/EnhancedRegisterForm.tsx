'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Chrome,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPasswordStrengthDisplay } from '@/components/auth/utils/password-strength';
import type { PasswordStrengthDisplay } from '@/components/auth/utils/password-strength';
import type { User } from '@/components/auth/UserProvider';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

type PasswordStrength = PasswordStrengthDisplay;

export default function EnhancedRegisterForm() {
  const router = useRouter();
  const { login } = useAuth();
  
  // Get redirect parameter from URL
  const getRedirectPath = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');
      if (redirectParam) {
        try {
          const decoded = decodeURIComponent(redirectParam);
          // Validate that redirect is a relative path (security measure)
          if (decoded.startsWith('/') && !decoded.startsWith('//')) {
            return decoded;
          }
        } catch (e) {
          console.error('Failed to decode redirect parameter:', e);
        }
      }
    }
    return '/';
  };
  
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(
    getPasswordStrengthDisplay('')
  );

  // Calculate password strength using the shared utility
  useEffect(() => {
    setPasswordStrength(getPasswordStrengthDisplay(formData.password));
  }, [formData.password]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = (): boolean => {
    // Validate name
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال الاسم الكامل');
      return false;
    }

    if (formData.name.trim().length < 2) {
      toast.error('الاسم يجب أن يكون على الأقل حرفين');
      return false;
    }

    if (formData.name.trim().length > 100) {
      toast.error('الاسم طويل جداً (الحد الأقصى 100 حرف)');
      return false;
    }

    // Validate email
    if (!formData.email.trim()) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('البريد الإلكتروني غير صالح. يرجى إدخال بريد إلكتروني صحيح');
      return false;
    }

    if (formData.email.trim().length > 255) {
      toast.error('البريد الإلكتروني طويل جداً');
      return false;
    }

    // Validate password
    if (!formData.password) {
      toast.error('يرجى إدخال كلمة المرور');
      return false;
    }

    // Check all password requirements
    const passwordChecks = passwordStrength.checks;
    if (!passwordChecks.minLength) {
      toast.error('كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل');
      return false;
    }

    if (!passwordChecks.hasUpper) {
      toast.error('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)');
      return false;
    }

    if (!passwordChecks.hasLower) {
      toast.error('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)');
      return false;
    }

    if (!passwordChecks.hasNumber) {
      toast.error('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)');
      return false;
    }

    if (!passwordChecks.hasSpecial) {
      toast.error('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%...)');
      return false;
    }

    if (passwordStrength.score < 40) {
      toast.error('كلمة المرور ضعيفة. يجب أن تستوفي جميع المتطلبات');
      return false;
    }

    if (formData.password.length > 128) {
      toast.error('كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)');
      return false;
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة. يرجى التأكد من تطابق كلمة المرور');
      return false;
    }

    // Validate terms acceptance
    if (!formData.acceptTerms) {
      toast.error('يجب الموافقة على الشروط والأحكام لإنشاء الحساب');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      let data: any;

      try {
        response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
          signal: controller.signal,
        });

        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');

        if (!response.ok) {
          if (isJson) {
            try {
              data = await response.json();
              
              // Handle specific error codes
              if (data.code === 'USER_EXISTS' || response.status === 409) {
                toast.error('البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول');
              } else if (data.code === 'INVALID_EMAIL') {
                toast.error('البريد الإلكتروني غير صالح. يرجى التحقق من البريد الإلكتروني');
              } else if (data.details) {
                // Handle validation errors
                const errorMessages: string[] = [];
                if (data.details.email) {
                  errorMessages.push(`البريد الإلكتروني: ${Array.isArray(data.details.email) ? data.details.email[0] : data.details.email}`);
                }
                if (data.details.password) {
                  errorMessages.push(`كلمة المرور: ${Array.isArray(data.details.password) ? data.details.password[0] : data.details.password}`);
                }
                if (data.details.name) {
                  errorMessages.push(`الاسم: ${Array.isArray(data.details.name) ? data.details.name[0] : data.details.name}`);
                }
                toast.error(errorMessages.length > 0 ? errorMessages.join('\n') : data.error || 'يرجى التحقق من البيانات المدخلة');
              } else {
                toast.error(data.error || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى');
              }
              clearTimeout(timeoutId);
              return;
            } catch (jsonError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('JSON parsing error:', jsonError);
              }
              throw new Error(`خطأ في الاتصال: ${response.status} ${response.statusText}`);
            }
          } else {
            const status = response.status;
            let errorMessage = `خطأ في الخادم (${status})`;
            
            if (status === 404) {
              errorMessage = 'مسار API غير موجود.';
            } else if (status >= 500) {
              errorMessage = 'خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.';
            }
            
            throw new Error(errorMessage);
          }
        }

        if (!isJson) {
          const status = response.status;
          throw new Error(
            status >= 500
              ? 'الخادم يواجه مشكلة تقنية. يرجى المحاولة لاحقاً.'
              : 'استجابة غير صحيحة من الخادم.'
          );
        }

        try {
          data = await response.json();
        } catch (jsonError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('JSON parsing error:', jsonError);
          }
          throw new Error('فشل في معالجة استجابة الخادم.');
        }
        
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
          toast.error('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          return;
        }

        if (
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('NetworkError') ||
          fetchError.message?.includes('Network request failed') ||
          !navigator.onLine
        ) {
          toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
          return;
        }

        toast.error(fetchError.message || 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.', { duration: 5000 });
        return;
      }

      // Check if account was created successfully
      if (!data.success || !data.user) {
        toast.error('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى');
        setIsLoading(false);
        return;
      }

      // Verify user data exists
      if (!data.user.id || !data.user.email) {
        console.error('Invalid user data in registration response:', data);
        toast.error('حدث خطأ في بيانات الحساب. يرجى المحاولة مرة أخرى');
        setIsLoading(false);
        return;
      }

      // Show success message for account creation
      toast.success('تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...', { duration: 2000 });
      
      // Show verification link in development only
      if (data.verificationLink && process.env.NODE_ENV === 'development') {
        console.log('Verification link:', data.verificationLink);
      }
      
      // Auto login after registration - with better error handling and retry logic
      const loginController = new AbortController();
      const loginTimeout = setTimeout(() => loginController.abort(), 30000);

      try {
        // Wait a bit to ensure user is fully created and committed to database
        await new Promise(resolve => setTimeout(resolve, 800));

        // Retry login up to 3 times if it fails
        let loginSuccess = false;
        let lastLoginError: any = null;
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 1) {
              // Wait longer between retries
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }

            const loginResponse = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Important for cookies
              body: JSON.stringify({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                rememberMe: true, // Remember user after registration
              }),
              signal: loginController.signal,
            });

            const loginContentType = loginResponse.headers.get('content-type');
            const isLoginJson = loginContentType?.includes('application/json');

            if (!loginResponse.ok) {
              // If login fails, try to get error message
              let errorMessage = 'فشل تسجيل الدخول التلقائي';
              let errorCode = 'LOGIN_FAILED';
              
              if (isLoginJson) {
                try {
                  const errorData = await loginResponse.json();
                  errorMessage = errorData.error || errorMessage;
                  errorCode = errorData.code || errorCode;
                  
                  // Handle connection errors specifically
                  if (errorCode === 'CONNECTION_ERROR' || errorCode === 'FETCH_ERROR') {
                    // Retry on connection errors
                    if (attempt < maxRetries) {
                      console.log(`Login attempt ${attempt} failed with connection error, retrying...`);
                      continue;
                    }
                    toast.error('خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.');
                    setIsLoading(false);
                    return;
                  }
                  
                  // Don't retry on authentication errors
                  if (errorCode === 'INVALID_CREDENTIALS' || loginResponse.status === 401) {
                    toast.error('فشل تسجيل الدخول. يرجى تسجيل الدخول يدوياً.');
                    router.push('/login?view=login');
                    setIsLoading(false);
                    return;
                  }
                } catch {
                  // Ignore JSON parsing errors
                }
              }
              
              // If it's a temporary error and we haven't exhausted retries, retry
              if (loginResponse.status >= 500 && attempt < maxRetries) {
                console.log(`Login attempt ${attempt} failed with server error, retrying...`);
                lastLoginError = { message: errorMessage, code: errorCode };
                continue;
              }
              
              // If it's a temporary error and we've exhausted retries
              if (loginResponse.status >= 500) {
                toast.error('الخادم يواجه مشكلة مؤقتة. يرجى المحاولة مرة أخرى خلال لحظات.');
                setIsLoading(false);
                return;
              }
              
              toast.error(`${errorMessage}. يرجى تسجيل الدخول يدوياً.`);
              router.push('/login?view=login');
              setIsLoading(false);
              return;
            }

            if (!isLoginJson) {
              // Server returned HTML instead of JSON
              if (attempt < maxRetries) {
                console.log(`Login attempt ${attempt} returned non-JSON, retrying...`);
                continue;
              }
              toast.error('حدث خطأ في الاستجابة. يرجى تسجيل الدخول يدوياً.');
              router.push('/login?view=login');
              setIsLoading(false);
              return;
            }

            // Parse login response
            let loginData: any;
            try {
              loginData = await loginResponse.json();
            } catch (jsonError) {
              console.error('JSON parsing error:', jsonError);
              if (attempt < maxRetries) {
                continue;
              }
              toast.error('حدث خطأ في معالجة الاستجابة. يرجى تسجيل الدخول يدوياً.');
              router.push('/login?view=login');
              setIsLoading(false);
              return;
            }

            // Validate login response
            if (!loginData.token || !loginData.user) {
              console.error('Invalid login response:', loginData);
              if (attempt < maxRetries) {
                continue;
              }
              toast.error('بيانات تسجيل الدخول غير صحيحة. يرجى تسجيل الدخول يدوياً.');
              router.push('/login?view=login');
              setIsLoading(false);
              return;
            }

            // Prepare user data for login function
            const userData: User = {
              id: loginData.user.id,
              email: loginData.user.email,
              name: loginData.user.name || data.user.name || formData.name.trim(),
              emailVerified: data.user.emailVerified || false,
              role: loginData.user.role || data.user.role || 'user',
              twoFactorEnabled: loginData.user.twoFactorEnabled || false,
              lastLogin: loginData.user.lastLogin,
              provider: 'local',
            };

            // Save token and user data
            login(loginData.token, userData);
            
            // Mark as successful
            loginSuccess = true;
            clearTimeout(loginTimeout);
            
            // Show success message
            toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح! مرحباً بك في منصتنا التعليمية!', { 
              duration: 3000 
            });
            
            // Always navigate to home page after successful registration
            // Use setTimeout to ensure toast is shown before navigation
            setTimeout(() => {
              router.push('/');
              router.refresh(); // Refresh to ensure the page updates with new user data
            }, 500);
            
            // Exit retry loop
            break;
          } catch (loginAttemptError: any) {
            lastLoginError = loginAttemptError;
            
            // If it's an abort error, don't retry
            if (loginAttemptError.name === 'AbortError' || loginAttemptError.message?.includes('aborted')) {
              toast.error('انتهت مهلة الاتصال. يرجى تسجيل الدخول يدوياً.');
              router.push('/login?view=login');
              setIsLoading(false);
              return;
            }
            
            // If it's a network error and we haven't exhausted retries, retry
            if (
              (loginAttemptError.message?.includes('Failed to fetch') ||
               loginAttemptError.message?.includes('NetworkError') ||
               loginAttemptError.message?.includes('FETCH_ERROR') ||
               !navigator.onLine) &&
              attempt < maxRetries
            ) {
              console.log(`Login attempt ${attempt} failed with network error, retrying...`);
              continue;
            }
            
            // If we've exhausted retries or it's not a retryable error
            if (attempt >= maxRetries) {
              if (
                loginAttemptError.message?.includes('Failed to fetch') ||
                loginAttemptError.message?.includes('NetworkError') ||
                loginAttemptError.message?.includes('FETCH_ERROR') ||
                !navigator.onLine
              ) {
                toast.error('خطأ في الاتصال. يرجى التحقق من الإنترنت وتسجيل الدخول يدوياً.');
              } else {
                toast.error('حدث خطأ أثناء تسجيل الدخول. يرجى تسجيل الدخول يدوياً.');
              }
              
              router.push('/login?view=login');
              setIsLoading(false);
              return;
            }
          }
        }
        
        // If we exhausted all retries without success
        if (!loginSuccess) {
          toast.error(lastLoginError?.message || 'فشل تسجيل الدخول بعد عدة محاولات. يرجى تسجيل الدخول يدوياً.');
          router.push('/login?view=login');
          setIsLoading(false);
          return;
        }
        
      } catch (loginError: any) {
        clearTimeout(loginTimeout);
        
        // Handle different types of errors
        if (loginError.name === 'AbortError' || loginError.message?.includes('aborted')) {
          toast.error('انتهت مهلة الاتصال. يرجى تسجيل الدخول يدوياً.');
        } else if (
          loginError.message?.includes('Failed to fetch') ||
          loginError.message?.includes('NetworkError') ||
          loginError.message?.includes('FETCH_ERROR') ||
          !navigator.onLine
        ) {
          toast.error('خطأ في الاتصال. يرجى التحقق من الإنترنت وتسجيل الدخول يدوياً.');
        } else {
          toast.error('حدث خطأ أثناء تسجيل الدخول. يرجى تسجيل الدخول يدوياً.');
        }
        
        router.push('/login?view=login');
        setIsLoading(false);
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.name === 'TypeError' ||
        !navigator.onLine
      ) {
        toast.error('خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.', { duration: 5000 });
      } else {
        toast.error(error?.message || 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google?type=register';
  };

  return (
    <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white">إنشاء حساب جديد</h2>
        <p className="mt-2 text-sm text-slate-300">
          انضم إلينا وابدأ رحلتك التعليمية
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Field */}
        <div>
          <label
            htmlFor="register-name"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            الاسم الكامل
          </label>
          <div className="relative">
            <User className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="register-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="أحمد محمد"
              className="w-full rounded-xl bg-white/10 py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
              aria-required="true"
              aria-label="الاسم الكامل"
              autoComplete="name"
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="register-email"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            البريد الإلكتروني
          </label>
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              className="w-full rounded-xl bg-white/10 py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              dir="ltr"
              required
              aria-required="true"
              aria-label="البريد الإلكتروني"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="register-password"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            كلمة المرور
          </label>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              ref={passwordInputRef}
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="••••••••"
              className={cn(
                "w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 transition-all duration-200",
                "focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400",
                focusedField === 'password' && 'ring-2 ring-indigo-400'
              )}
              dir="ltr"
              required
              aria-required="true"
              aria-label="كلمة المرور"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Enhanced Password Strength Indicator */}
          <AnimatePresence>
            {formData.password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "mt-3 rounded-xl border p-4 space-y-3",
                  passwordStrength.bgColor,
                  passwordStrength.borderColor
                )}
              >
                {/* Strength Label and Score */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">قوة كلمة المرور:</span>
                  <div className="flex items-center gap-2">
                    <motion.span
                      key={passwordStrength.label}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full",
                        passwordStrength.score >= 80 ? "text-green-300 bg-green-500/20" :
                        passwordStrength.score >= 60 ? "text-blue-300 bg-blue-500/20" :
                        passwordStrength.score >= 40 ? "text-yellow-300 bg-yellow-500/20" :
                        passwordStrength.score >= 20 ? "text-orange-300 bg-orange-500/20" :
                        "text-red-300 bg-red-500/20"
                      )}
                    >
                      {passwordStrength.label}
                    </motion.span>
                    <span className="text-xs text-slate-400">
                      {passwordStrength.score}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10 backdrop-blur">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${passwordStrength.score}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn(
                        "h-full rounded-full shadow-lg",
                        passwordStrength.color
                      )}
                    />
                  </div>
                  {/* Segment Indicators */}
                  <div className="flex gap-1 h-1">
                    {[0, 20, 40, 60, 80, 100].slice(0, -1).map((threshold, index) => (
                      <div
                        key={threshold}
                        className={cn(
                          "flex-1 rounded-full transition-all",
                          passwordStrength.score >= threshold
                            ? passwordStrength.color
                            : "bg-white/5"
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { check: passwordStrength.checks.minLength, label: '8 أحرف على الأقل', key: 'minLength' },
                    { check: passwordStrength.checks.hasUpper, label: 'حرف كبير (A-Z)', key: 'hasUpper' },
                    { check: passwordStrength.checks.hasLower, label: 'حرف صغير (a-z)', key: 'hasLower' },
                    { check: passwordStrength.checks.hasNumber, label: 'رقم (0-9)', key: 'hasNumber' },
                    { check: passwordStrength.checks.hasSpecial, label: 'رمز خاص (!@#$%)', key: 'hasSpecial' },
                  ].map((req, index) => (
                    <motion.div
                      key={req.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all",
                        req.check
                          ? "bg-green-500/20 border border-green-500/30"
                          : "bg-white/5 border border-white/10"
                      )}
                    >
                      {req.check ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      )}
                      <span className={cn(
                        "text-xs",
                        req.check ? "text-green-300" : "text-slate-400"
                      )}>
                        {req.label}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Security Tips */}
                {passwordStrength.score < 60 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2"
                  >
                    <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-200">
                      {passwordStrength.score < 40 
                        ? 'نقترح إضافة المزيد من الأحرف والأرقام والرموز لزيادة الأمان'
                        : 'يمكنك جعل كلمة المرور أقوى بإضافة المزيد من الأحرف والرموز'}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="register-confirm-password"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            تأكيد كلمة المرور
          </label>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              ref={confirmPasswordInputRef}
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              placeholder="••••••••"
              className={cn(
                "w-full rounded-xl bg-white/10 py-3 pr-12 pl-12 text-white placeholder-slate-400 transition-all duration-200",
                "focus:bg-white/20 focus:outline-none focus:ring-2",
                formData.confirmPassword && formData.password !== formData.confirmPassword
                  ? "ring-2 ring-red-500"
                  : "focus:ring-indigo-400",
                focusedField === 'confirmPassword' && formData.password === formData.confirmPassword && 'ring-2 ring-indigo-400'
              )}
              dir="ltr"
              required
              aria-required="true"
              aria-label="تأكيد كلمة المرور"
              {...(formData.confirmPassword && formData.password !== formData.confirmPassword
                ? { 'aria-invalid': true as const, 'aria-describedby': 'confirm-password-error' }
                : {})}
              autoComplete="new-password"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={showConfirmPassword ? 'إخفاء تأكيد كلمة المرور' : 'إظهار تأكيد كلمة المرور'}
              aria-pressed={showConfirmPassword}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </motion.button>
          </div>
          <AnimatePresence>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                id="confirm-password-error"
                className="mt-1 text-xs text-red-300"
                role="alert"
                aria-live="polite"
              >
                كلمات المرور غير متطابقة
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start gap-3">
          <input
            id="acceptTerms"
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleInputChange}
            className="mt-1 h-4 w-4 rounded border-slate-400 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-400"
            required
            aria-required="true"
            aria-label="الموافقة على الشروط والأحكام"
          />
          <label htmlFor="acceptTerms" className="text-sm text-slate-200 cursor-pointer">
            أوافق على{' '}
            <a href="/terms" className="text-indigo-300 hover:text-indigo-200">
              الشروط والأحكام
            </a>{' '}
            و{' '}
            <a href="/privacy" className="text-indigo-300 hover:text-indigo-200">
              سياسة الخصوصية
            </a>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ إنشاء الحساب...
            </span>
          ) : (
            'إنشاء الحساب'
          )}
        </button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-slate-900 px-4 text-slate-400">أو</span>
          </div>
        </div>

        {/* Google Signup */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          <Chrome className="h-5 w-5" />
          التسجيل بواسطة جوجل
        </button>
      </form>

      {/* Security Notice */}
      <div className="mt-6 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-indigo-300 mt-0.5" />
          <div className="text-xs text-indigo-200">
            <p className="font-semibold mb-1">أمان معزز</p>
            <p>
              سيتم تفعيل المصادقة الثنائية تلقائياً لحماية حسابك. يمكنك إدارة إعدادات الأمان من لوحة التحكم.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
