'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { logger } from '@/lib/logger';
import { getPasswordStrengthDisplay } from '@/components/auth/utils/password-strength';
import { z } from 'zod';
import type { User as UserType } from '@/contexts/auth-context';

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export function useRegisterForm() {
  const router = useRouter();
  const { login } = useUnifiedAuth();
  const [isGoogleOAuthEnabled, setIsGoogleOAuthEnabled] = useState<boolean>(true);
  
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  // Check OAuth provider status
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/oauth/status');
        if (response.ok) {
          const data = await response.json();
          setIsGoogleOAuthEnabled(data.providers?.google?.enabled ?? false);
        }
      } catch (error) {
        logger.error('Failed to check OAuth status:', error);
        setIsGoogleOAuthEnabled(false);
      }
    };
    
    checkOAuthStatus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = (): boolean => {
    setFieldErrors({}); // Clear previous errors

    const registerSchema = z.object({
      name: z
        .string()
        .min(2, 'الاسم يجب أن يكون على الأقل حرفين')
        .max(100, 'الاسم طويل جداً (الحد الأقصى 100 حرف)'),
      email: z
        .string()
        .min(1, 'يرجى إدخال البريد الإلكتروني')
        .email('البريد الإلكتروني غير صالح. يرجى إدخال بريد إلكتروني صحيح')
        .max(255, 'البريد الإلكتروني طويل جداً'),
      password: z
        .string()
        .min(8, 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل')
        .max(128, 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)')
        .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)')
        .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)')
        .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)')
        .regex(/[!@#$%^&*(),.?":{}|<>]/, 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%...)'),
      confirmPassword: z.string(),
      acceptTerms: z.literal(true, {
        errorMap: () => ({ message: 'يجب الموافقة على الشروط والأحكام لإنشاء الحساب' }),
      }),
    }).refine((data) => data.password === data.confirmPassword, {
      message: 'كلمات المرور غير متطابقة. يرجى التأكد من تطابق كلمة المرور',
      path: ['confirmPassword'],
    });

    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path.length > 0) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setFieldErrors(errors);
      
      const errorMessages = result.error.issues.map((issue) => issue.message);
      toast.error(errorMessages[0]); // Show the first error
      return false;
    }

    // Additional check for password strength score if needed, but regex covers most requirements
    const passwordStrength = getPasswordStrengthDisplay(formData.password);
    if (passwordStrength.score < 40) {
      toast.error('كلمة المرور ضعيفة. يجب أن تستوفي جميع المتطلبات');
      setFieldErrors(prev => ({ ...prev, password: 'كلمة المرور ضعيفة. يجب أن تستوفي جميع المتطلبات' }));
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      let data: any;

      try {
        response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
              if (data.code === 'USER_EXISTS' || response.status === 409) {
                toast.error('البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول');
              } else if (data.details) {
                const errorMessages: string[] = [];
                if (data.details.email) errorMessages.push(`البريد الإلكتروني: ${Array.isArray(data.details.email) ? data.details.email[0] : data.details.email}`);
                if (data.details.password) errorMessages.push(`كلمة المرور: ${Array.isArray(data.details.password) ? data.details.password[0] : data.details.password}`);
                if (data.details.name) errorMessages.push(`الاسم: ${Array.isArray(data.details.name) ? data.details.name[0] : data.details.name}`);
                toast.error(errorMessages.length > 0 ? errorMessages.join('\n') : data.error || 'يرجى التحقق من البيانات المدخلة');
              } else {
                toast.error(data.error || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى');
              }
              clearTimeout(timeoutId);
              return;
            } catch (jsonError) {
              throw new Error(`خطأ في الاتصال: ${response.status} ${response.statusText}`);
            }
          } else {
            throw new Error(response.status === 404 ? 'مسار API غير موجود.' : 'خطأ داخلي في الخادم.');
          }
        }

        if (!isJson) throw new Error('استجابة غير صحيحة من الخادم.');
        data = await response.json();
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          toast.error('انتهت مهلة الاتصال بالخادم.');
          return;
        }
        toast.error(fetchError.message || 'حدث خطأ أثناء إنشاء الحساب.');
        return;
      }

      if (!data.success || !data.user) {
        toast.error('حدث خطأ أثناء إنشاء الحساب.');
        setIsLoading(false);
        return;
      }

      // Check if email verification is required
      if (data.requiresEmailVerification) {
        toast.success('تم إنشاء الحساب بنجاح! يرجى تفعيل بريدك الإلكتروني.', { duration: 5000 });
        // Redirect to a page that tells the user to check their email
        // We can use the existing verify-email page with a query param or a new page
        // For now, let's redirect to login with a message or a dedicated sent page
        // Since we don't have a dedicated "sent" page, we'll use a toast and redirect to login
        // actually, let's make a simple "check your email" view or redirect to login
        
        setTimeout(() => {
           router.push('/login?verified=pending&email=' + encodeURIComponent(formData.email));
        }, 2000);
        return;
      }

      toast.success('تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...', { duration: 2000 });
      
      // Auto login logic (only if verification not required)
      await performAutoLogin();

    } catch (error: any) {
      logger.error('Registration error:', error);
      toast.error(error?.message || 'حدث خطأ أثناء إنشاء الحساب.');
    } finally {
      setIsLoading(false);
    }
  };

  const performAutoLogin = async () => {
    const loginController = new AbortController();
    const loginTimeout = setTimeout(() => loginController.abort(), 30000);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      let loginSuccess = false;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));

          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: formData.email.trim().toLowerCase(),
              password: formData.password,
              rememberMe: true,
            }),
            signal: loginController.signal,
          });

          if (!loginResponse.ok) {
             if (loginResponse.status >= 500 && attempt < maxRetries) continue;
             throw new Error('فشل تسجيل الدخول التلقائي');
          }

          const loginData = await loginResponse.json();
          if (!loginData.token || !loginData.user) throw new Error('بيانات تسجيل الدخول غير صحيحة');

          const userData: UserType = {
            id: loginData.user.id,
            email: loginData.user.email,
            name: loginData.user.name || formData.name.trim(),
            emailVerified: loginData.user.emailVerified || false,
            role: loginData.user.role || 'user',
            twoFactorEnabled: loginData.user.twoFactorEnabled || false,
            lastLogin: loginData.user.lastLogin,
            provider: 'local',
          };

          login(loginData.token, userData);
          loginSuccess = true;
          clearTimeout(loginTimeout);
          
          toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح!', { duration: 3000 });
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 500);
          break;
        } catch (e) {
          if (attempt >= maxRetries) throw e;
        }
      }
      
      if (!loginSuccess) throw new Error('فشل تسجيل الدخول بعد عدة محاولات');
      
    } catch (error: any) {
      clearTimeout(loginTimeout);
      toast.error('تم إنشاء الحساب ولكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.');
      router.push('/login?view=login');
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google?type=register';
  };

  return {
    formData,
    showPassword,
    showConfirmPassword,
    isLoading,
    focusedField,
    isGoogleOAuthEnabled,
    passwordInputRef,
    confirmPasswordInputRef,
    setShowPassword,
    setShowConfirmPassword,
    setFocusedField,
    handleInputChange,
    handleSubmit,
    handleGoogleSignup,
    fieldErrors,
  };
}
