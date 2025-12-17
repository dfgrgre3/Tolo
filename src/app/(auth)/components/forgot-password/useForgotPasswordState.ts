import { useState, useCallback } from 'react';

export type ForgotPasswordStep =
    | 'request'      // طلب إعادة التعيين
    | 'verify'       // التحقق من الرمز
    | 'reset'        // تعيين كلمة مرور جديدة
    | 'success';     // نجاح العملية

export interface ForgotPasswordState {
    step: ForgotPasswordStep;
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
    isLoading: boolean;
    error: string | null;
    countdown: number;
    canResend: boolean;
    resetToken: string | null;
}

const initialState: ForgotPasswordState = {
    step: 'request',
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
    isLoading: false,
    error: null,
    countdown: 0,
    canResend: true,
    resetToken: null,
};

export const useForgotPasswordState = () => {
    const [state, setState] = useState<ForgotPasswordState>(initialState);

    const setEmail = useCallback((email: string) => {
        setState(prev => ({ ...prev, email, error: null }));
    }, []);

    const setCode = useCallback((code: string) => {
        // فقط أرقام، بحد أقصى 6 أرقام
        const sanitized = code.replace(/\D/g, '').slice(0, 6);
        setState(prev => ({ ...prev, code: sanitized, error: null }));
    }, []);

    const setNewPassword = useCallback((password: string) => {
        setState(prev => ({ ...prev, newPassword: password, error: null }));
    }, []);

    const setConfirmPassword = useCallback((password: string) => {
        setState(prev => ({ ...prev, confirmPassword: password, error: null }));
    }, []);

    // Go back to previous step
    const goBack = useCallback(() => {
        setState(prev => {
            switch (prev.step) {
                case 'verify':
                    return { ...prev, step: 'request', code: '', error: null };
                case 'reset':
                    return { ...prev, step: 'verify', newPassword: '', confirmPassword: '', error: null };
                default:
                    return prev;
            }
        });
    }, []);

    // Reset everything
    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    return {
        state,
        setState,
        setEmail,
        setCode,
        setNewPassword,
        setConfirmPassword,
        goBack,
        reset,
    };
};
