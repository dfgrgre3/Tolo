import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { forgotPassword, verifyResetCode, resetPassword as resetPasswordApi } from '@/lib/api/auth-client';
import { useForgotPasswordState } from './useForgotPasswordState';
import { useForgotPasswordValidation } from './useForgotPasswordValidation';

export const useForgotPasswordSubmission = (
    stateProps: ReturnType<typeof useForgotPasswordState>,
    validation: ReturnType<typeof useForgotPasswordValidation>
) => {
    const { state, setState } = stateProps;
    const { validateEmail, validateCode, validatePasswords } = validation;

    // Start countdown timer
    const startCountdown = useCallback(() => {
        setState(prev => ({ ...prev, countdown: 60, canResend: false }));
    }, [setState]);

    useEffect(() => {
        if (state.countdown <= 0) return;

        const timer = setInterval(() => {
            setState(prev => {
                if (prev.countdown <= 1) {
                    return { ...prev, countdown: 0, canResend: true };
                }
                return { ...prev, countdown: prev.countdown - 1 };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [state.countdown, setState]);

    // Request password reset
    const requestReset = useCallback(async (): Promise<boolean> => {
        const emailError = validateEmail(state.email);
        if (emailError) {
            setState(prev => ({ ...prev, error: emailError }));
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await forgotPassword(state.email.trim());

            setState(prev => ({
                ...prev,
                isLoading: false,
                step: 'verify',
                resetToken: null,
            }));

            startCountdown();
            toast.success('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : (error as { error?: string })?.error || 'حدث خطأ غير متوقع';
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            toast.error(message);
            return false;
        }
    }, [state.email, validateEmail, startCountdown, setState]);

    // Verify the code
    const verifyCode = useCallback(async (): Promise<boolean> => {
        const codeError = validateCode(state.code);
        if (codeError) {
            setState(prev => ({ ...prev, error: codeError }));
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await verifyResetCode({
                email: state.email.trim(),
                code: state.code,
            });

            setState(prev => ({
                ...prev,
                isLoading: false,
                step: 'reset',
                resetToken: response.resetToken || prev.resetToken,
            }));

            toast.success('تم التحقق بنجاح');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : (error as { error?: string })?.error || 'حدث خطأ غير متوقع';
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            toast.error(message);
            return false;
        }
    }, [state.email, state.code, validateCode, setState]);

    // Reset password
    const resetPassword = useCallback(async (): Promise<boolean> => {
        const passwordErrors = validatePasswords(state.newPassword, state.confirmPassword);
        if (passwordErrors.password || passwordErrors.confirm) {
            setState(prev => ({
                ...prev,
                error: passwordErrors.password || passwordErrors.confirm,
            }));
            return false;
        }

        if (!state.resetToken) {
            setState(prev => ({ ...prev, error: 'رمز إعادة التعيين مفقود' }));
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await resetPasswordApi({
                token: state.resetToken,
                password: state.newPassword,
            });

            setState(prev => ({
                ...prev,
                isLoading: false,
                step: 'success',
            }));

            toast.success('تم تغيير كلمة المرور بنجاح!');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : (error as { error?: string })?.error || 'حدث خطأ غير متوقع';
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            toast.error(message);
            return false;
        }
    }, [state.resetToken, state.newPassword, state.confirmPassword, validatePasswords, setState]);

    // Resend code
    const resendCode = useCallback(async (): Promise<boolean> => {
        if (!state.canResend) return false;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await forgotPassword(state.email.trim());

            setState(prev => ({ ...prev, isLoading: false, code: '' }));
            startCountdown();
            toast.success('تم إعادة إرسال رمز التحقق');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : (error as { error?: string })?.error || 'حدث خطأ غير متوقع';
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            toast.error(message);
            return false;
        }
    }, [state.email, state.canResend, startCountdown, setState]);

    return {
        requestReset,
        verifyCode,
        resetPassword,
        resendCode,
    };
};
