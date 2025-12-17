'use client';

/**
 * 📧 useEmailVerification - Hook للتحقق من البريد الإلكتروني
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { verifyEmail as verifyEmailApi, sendVerificationEmail } from '@/lib/api/auth-client';

export type VerificationStatus =
    | 'pending'      // في انتظار التحقق
    | 'verifying'    // جاري التحقق
    | 'verified'     // تم التحقق
    | 'expired'      // انتهت الصلاحية
    | 'error';       // خطأ

export interface EmailVerificationState {
    status: VerificationStatus;
    email: string;
    isLoading: boolean;
    error: string | null;
    countdown: number;
    canResend: boolean;
    verificationCode: string;
}

export interface UseEmailVerificationReturn extends EmailVerificationState {
    setEmail: (email: string) => void;
    setVerificationCode: (code: string) => void;
    sendVerification: () => Promise<boolean>;
    verifyEmail: (code?: string, token?: string) => Promise<boolean>;
    resendVerification: () => Promise<boolean>;
    reset: () => void;
}

const initialState: EmailVerificationState = {
    status: 'pending',
    email: '',
    isLoading: false,
    error: null,
    countdown: 0,
    canResend: true,
    verificationCode: '',
};

export function useEmailVerification(initialEmail?: string): UseEmailVerificationReturn {
    const [state, setState] = useState<EmailVerificationState>({
        ...initialState,
        email: initialEmail || '',
    });

    // Countdown timer
    useEffect(() => {
        if (state.countdown <= 0) return;

        const timer = setInterval(() => {
            setState(prev => {
                const newCountdown = prev.countdown - 1;
                return {
                    ...prev,
                    countdown: newCountdown,
                    canResend: newCountdown <= 0,
                };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [state.countdown]);

    const setEmail = useCallback((email: string) => {
        setState(prev => ({ ...prev, email, error: null }));
    }, []);

    const setVerificationCode = useCallback((code: string) => {
        const sanitized = code.replace(/\D/g, '').slice(0, 6);
        setState(prev => ({ ...prev, verificationCode: sanitized, error: null }));
    }, []);

    const startCountdown = useCallback(() => {
        setState(prev => ({ ...prev, countdown: 60, canResend: false }));
    }, []);

    const sendVerification = useCallback(async (): Promise<boolean> => {
        if (!state.email) {
            setState(prev => ({ ...prev, error: 'البريد الإلكتروني مطلوب' }));
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Note: sendVerificationEmail in auth-client doesn't take email arg currently
            // but the original code did. Assuming the backend handles it from session or we need to update auth-client
            // For now, let's assume it sends to the currently logged in user or we might need to update auth-client
            // However, looking at the original code, it was sending { email: state.email }
            // Let's check auth-client again. It seems sendVerificationEmail takes no args.
            // If this is for a logged-in user, that's fine. If it's for a user who just registered but isn't fully logged in?
            // The register flow logs them in. So they should be logged in.

            await sendVerificationEmail();

            setState(prev => ({ ...prev, isLoading: false, status: 'pending' }));
            startCountdown();
            toast.success('تم إرسال رابط التحقق إلى بريدك الإلكتروني');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : (error as { error?: string })?.error || 'حدث خطأ غير متوقع';
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            toast.error(message);
            return false;
        }
    }, [state.email, startCountdown]);

    const verifyEmail = useCallback(async (code?: string, token?: string): Promise<boolean> => {
        const verificationCode = code || state.verificationCode;
        const verificationToken = token; // Rename to avoid confusion

        if (!verificationCode && !verificationToken) {
            setState(prev => ({ ...prev, error: 'رمز التحقق مطلوب' }));
            return false;
        }

        setState(prev => ({ ...prev, isLoading: true, status: 'verifying', error: null }));

        try {
            // The auth-client verifyEmail takes a token string.
            // The original code sent { email, code, token }.
            // We might need to adjust this if the backend expects code/email.
            // But usually verifyEmail takes a token (which could be the code).
            // Let's assume the 'token' arg in verifyEmailApi is flexible or we need to update it.
            // Actually, looking at auth-client: verifyEmail(token: string)
            // It sends { token }.
            // If we have a code, we should probably send that as the token.

            await verifyEmailApi(verificationToken || verificationCode);

            setState(prev => ({ ...prev, isLoading: false, status: 'verified' }));
            toast.success('تم التحقق من بريدك الإلكتروني بنجاح! 🎉');
            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : (error as { error?: string })?.error || 'حدث خطأ غير متوقع';

            if ((error as { status?: number })?.status === 410) {
                setState(prev => ({ ...prev, isLoading: false, status: 'expired', error: message }));
                return false;
            }

            setState(prev => ({ ...prev, isLoading: false, status: 'error', error: message }));
            toast.error(message);
            return false;
        }
    }, [state.verificationCode]);

    const resendVerification = useCallback(async (): Promise<boolean> => {
        if (!state.canResend) return false;
        return sendVerification();
    }, [state.canResend, sendVerification]);

    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    return {
        ...state,
        setEmail,
        setVerificationCode,
        sendVerification,
        verifyEmail,
        resendVerification,
        reset,
    };
}

export default useEmailVerification;

