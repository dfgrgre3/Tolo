import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { loginUser, verifyTwoFactor } from '@/lib/api/auth-client';
import { logger } from '@/lib/logger';
import { getRedirectPath, clearStoredRedirect, formatLockoutTime } from '../utils/login-form.utils';
import { LOGIN_ERRORS, getLoginErrorMessage } from '@/lib/auth/login-errors';
import { LoginResponse, LoginErrorResponse } from '@/types/api/auth';
import { useLoginState } from './useLoginState';

export const useLoginSubmission = (
    state: ReturnType<typeof useLoginState>
) => {
    const router = useRouter();
    const { login: unifiedLogin, refreshUser } = useUnifiedAuth();

    const handleLoginSuccess = async (data: LoginResponse) => {
        // Reset security state
        state.setRequiresCaptcha(false);
        state.setCaptchaToken(null);
        state.setFailedAttempts(0);
        state.setLockoutSeconds(null);
        state.resetErrors();

        try {
            if (!data.token || !data.user) {
                throw new Error('Invalid response data');
            }

            const userData = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name ?? undefined,
                role: data.user.role ?? 'user',
                emailVerified: data.user.emailVerified ?? false,
                twoFactorEnabled: data.user.twoFactorEnabled ?? false,
                lastLogin: typeof data.user.lastLogin === 'string' ? data.user.lastLogin :
                    (data.user.lastLogin && typeof data.user.lastLogin === 'object' && 'toISOString' in data.user.lastLogin
                        ? (data.user.lastLogin as Date).toISOString()
                        : data.user.lastLogin ? String(data.user.lastLogin) : undefined),
                provider: 'local' as const,
            };

            await unifiedLogin(data.token, userData, data.sessionId);

            if (data.accountWasCreated) {
                toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح!');
            } else {
                toast.success('تم تسجيل الدخول بنجاح!');
            }

            refreshUser().catch(() => { });
            state.setIsLoading(false);

            const redirectPath = getRedirectPath();
            clearStoredRedirect();
            router.replace(redirectPath);

        } catch (error) {
            logger.error('Login success handler error:', error);
            toast.error(LOGIN_ERRORS.UNKNOWN_ERROR);
            state.setIsLoading(false);
        }
    };

    const handleLoginError = (error: unknown) => {
        let errorCode = 'UNKNOWN_ERROR';
        let errorMessage: string = LOGIN_ERRORS.UNKNOWN_ERROR;
        let retryAfter = 0;

        if (error && typeof error === 'object') {
            const err = error as {
                code?: string;
                error?: string;
                retryAfterSeconds?: number;
                requiresCaptcha?: boolean;
                failedAttempts?: number;
            };
            errorCode = err.code || 'UNKNOWN_ERROR';
            errorMessage = err.error || getLoginErrorMessage(errorCode);

            if (err.retryAfterSeconds) {
                retryAfter = err.retryAfterSeconds;
            }

            if (err.requiresCaptcha) {
                state.setRequiresCaptcha(true);
                state.setFailedAttempts(err.failedAttempts || 0);
            }
        }

        if (errorCode === 'RATE_LIMITED' && retryAfter > 0) {
            state.setLockoutSeconds(retryAfter);
            errorMessage = `${LOGIN_ERRORS.RATE_LIMITED} (${formatLockoutTime(retryAfter)})`;
        }

        state.setFormErrorMessage(errorMessage);
        state.setFormErrorCode(errorCode);
        state.setIsShaking(true);
        state.setIsLoading(false);
        toast.error(errorMessage);
    };

    const submitLogin = async () => {
        state.setIsLoading(true);
        state.setIsCreatingAccount(false);
        state.resetErrors();

        try {
            const loginRequest = {
                email: state.formData.email.trim().toLowerCase(),
                password: state.formData.password,
                rememberMe: state.formData.rememberMe,
                deviceFingerprint: state.deviceFingerprint || undefined,
                captchaToken: state.captchaToken || undefined,
            };

            // Add timeout
            const loginPromise = loginUser(loginRequest);
            const timeoutPromise = new Promise<LoginResponse>((_, reject) => {
                setTimeout(() => reject({ code: 'REQUEST_TIMEOUT', error: LOGIN_ERRORS.REQUEST_TIMEOUT }), 30000);
            });

            const data = await Promise.race([loginPromise, timeoutPromise]);

            if (data.requiresTwoFactor) {
                state.setShowTwoFactor(true);
                state.setLoginAttemptId(data.loginAttemptId!);
                state.setIsLoading(false);
                toast.info('يرجى إدخال رمز التحقق.');
                return;
            }

            if (data.riskAssessment) {
                state.setRiskLevel(data.riskAssessment.level);
            }

            await handleLoginSuccess(data);

        } catch (error) {
            handleLoginError(error);
        }
    };

    const submitTwoFactor = async () => {
        state.setIsLoading(true);
        state.resetErrors();

        try {
            const data = await verifyTwoFactor({
                loginAttemptId: state.loginAttemptId,
                code: state.twoFactorCode,
            });

            await handleLoginSuccess(data);
        } catch (error) {
            handleLoginError(error);
            state.setTwoFactorCode('');
        }
    };

    return {
        submitLogin,
        submitTwoFactor,
    };
};
