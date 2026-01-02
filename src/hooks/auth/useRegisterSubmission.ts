import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { registerUser, loginUser } from '@/lib/api/auth-client';
import { logger } from '@/lib/logger';
import { RegisterFormData } from '@/types/auth-form';

import { useRegisterState } from './useRegisterState';
import { User as UserType } from '@/contexts/auth-context';

export const useRegisterSubmission = (state: ReturnType<typeof useRegisterState>) => {
    const router = useRouter();
    const { login } = useUnifiedAuth();

    const performAutoLogin = async (formData: RegisterFormData) => {
        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            let loginSuccess = false;
            const maxRetries = 3;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 1) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));

                    const loginResponse = await loginUser({
                        email: formData.email.trim().toLowerCase(),
                        password: formData.password,
                        rememberMe: true,
                    });

                    if (!loginResponse.token || !loginResponse.user) throw new Error('بيانات تسجيل الدخول غير صحيحة');

                    const userData: UserType = {
                        id: loginResponse.user.id,
                        email: loginResponse.user.email,
                        name: loginResponse.user.name || formData.name.trim(),
                        emailVerified: loginResponse.user.emailVerified || false,
                        role: loginResponse.user.role || 'user',
                        twoFactorEnabled: loginResponse.user.twoFactorEnabled || false,
                        lastLogin: typeof loginResponse.user.lastLogin === 'string' ? loginResponse.user.lastLogin : undefined,
                        provider: 'local',
                    };

                    login(loginResponse.token, userData);
                    loginSuccess = true;

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

        } catch (error: unknown) {
            logger.error('Auto login error:', error);
            toast.error('تم إنشاء الحساب ولكن فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.');
            router.push('/login?view=login');
        }
    };

    const submitRegister = async (formData: RegisterFormData) => {
        state.setIsLoading(true);

        try {
            const data = await registerUser({
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
            });

            // Check if email verification is required
            if (data.requiresEmailVerification) {
                toast.success('تم إنشاء الحساب بنجاح! يرجى تفعيل بريدك الإلكتروني.', { duration: 5000 });

                setTimeout(() => {
                    router.push('/login?verified=pending&email=' + encodeURIComponent(formData.email));
                }, 2000);
                return;
            }

            toast.success('تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...', { duration: 2000 });

            // Auto login logic (only if verification not required)
            await performAutoLogin(formData);

        } catch (error: unknown) {
            logger.error('Registration error:', error);

            const err = error as {
                code?: string;
                status?: number;
                details?: Record<string, string | string[]>;
                error?: string;
                message?: string;
            };

            // Handle specific error codes if available in the error object
            if (err.code === 'USER_EXISTS' || err.status === 409) {
                toast.error('البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول');
            } else if (err.details) {
                const errorMessages: string[] = [];
                if (err.details.email) errorMessages.push(`البريد الإلكتروني: ${Array.isArray(err.details.email) ? err.details.email[0] : err.details.email}`);
                if (err.details.password) errorMessages.push(`كلمة المرور: ${Array.isArray(err.details.password) ? err.details.password[0] : err.details.password}`);
                if (err.details.name) errorMessages.push(`الاسم: ${Array.isArray(err.details.name) ? err.details.name[0] : err.details.name}`);
                toast.error(errorMessages.length > 0 ? errorMessages.join('\n') : err.error || 'يرجى التحقق من البيانات المدخلة');
            } else {
                toast.error(err.message || err.error || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى');
            }
        } finally {
            state.setIsLoading(false);
        }
    };

    return { submitRegister };
};
