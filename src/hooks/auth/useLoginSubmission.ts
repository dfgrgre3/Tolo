import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUnifiedAuth } from '@/contexts/auth-context';
import { loginUser, verifyTwoFactor } from '@/lib/api/auth-client';
import { logger } from '@/lib/logger';
import { getRedirectPath, clearStoredRedirect, formatLockoutTime } from '@/app/(auth)/_utils/login-form.utils';
import { LOGIN_ERRORS, getLoginErrorMessage } from '@/lib/auth/login-errors';
import { LoginResponse, LoginErrorResponse } from '@/types/api/auth';
import { useLoginState } from './useLoginState';

export const useLoginSubmission = (
    state: ReturnType<typeof useLoginState>
) => {
    const router = useRouter();
    const { loginWithCredentials, loginWithTwoFactor: contextVerifyTwoFactor, refreshUser } = useUnifiedAuth();

    const handleLoginSuccess = async (data: LoginResponse) => {
        // Reset security state
        state.setRequiresCaptcha(false);
        state.setCaptchaToken(null);
        state.setFailedAttempts(0);
        state.setLockoutSeconds(null);
        state.resetErrors();

        state.setIsLoading(false);

        if (data.accountWasCreated) {
            toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح!');
        } else {
            toast.success('تم تسجيل الدخول بنجاح!');
        }

        refreshUser().catch(() => { });

        const redirectPath = getRedirectPath();
        clearStoredRedirect();
        router.replace(redirectPath);
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
            // Use unified context method
            const response = await loginWithCredentials(
                state.formData.email.trim().toLowerCase(),
                state.formData.password,
                state.formData.rememberMe,
                {
                    deviceFingerprint: state.deviceFingerprint || undefined,
                    captchaToken: state.captchaToken || undefined,
                }
            );

            // Handle 2FA requirement
            if ('requiresTwoFactor' in response && response.requiresTwoFactor) {
                state.setShowTwoFactor(true);
                state.setLoginAttemptId(response.loginAttemptId);
                state.setIsLoading(false);
                toast.info('يرجى إدخال رمز التحقق.');
                return;
            }

            // Handle success (LoginResponse)
            const successData = response as LoginResponse;
            if (successData.riskAssessment) {
                state.setRiskLevel(successData.riskAssessment.level);
            }

            await handleLoginSuccess(successData);

        } catch (error) {
            handleLoginError(error);
        }
    };

    const submitTwoFactor = async () => {
        state.setIsLoading(true);
        state.resetErrors();

        try {
            await contextVerifyTwoFactor(
                state.loginAttemptId,
                state.twoFactorCode
            );

            // Since contextVerifyTwoFactor returns void on success (or throws),
            // we construct a minimal success response for the handler
            const minimalSuccessData: LoginResponse = {
                token: 'handled-by-context',
                user: { id: '', email: '', role: 'user', emailVerified: false, twoFactorEnabled: false } as any, // Dummy data, not used
                sessionId: 'handled-by-context',
                accountWasCreated: false
            };

            await handleLoginSuccess(minimalSuccessData);
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
