'use client';

/**
 * 🔑 useForgotPassword - Hook لاستعادة كلمة المرور
 * 
 * يدير جميع عمليات استعادة كلمة المرور:
 * - طلب إعادة تعيين كلمة المرور
 * - التحقق من الرمز
 * - تعيين كلمة مرور جديدة
 */

import { useForgotPasswordState, ForgotPasswordState, ForgotPasswordStep } from './useForgotPasswordState';
import { useForgotPasswordValidation } from './useForgotPasswordValidation';
import { useForgotPasswordSubmission } from './useForgotPasswordSubmission';

export type { ForgotPasswordState, ForgotPasswordStep };

export interface UseForgotPasswordReturn extends ForgotPasswordState {
    // Actions
    setEmail: (email: string) => void;
    setCode: (code: string) => void;
    setNewPassword: (password: string) => void;
    setConfirmPassword: (password: string) => void;
    requestReset: () => Promise<boolean>;
    verifyCode: () => Promise<boolean>;
    resetPassword: () => Promise<boolean>;
    resendCode: () => Promise<boolean>;
    goBack: () => void;
    reset: () => void;

    // Validation
    validateEmail: () => string | null;
    validateCode: () => string | null;
    validatePasswords: () => { password: string | null; confirm: string | null };
}

export function useForgotPassword(): UseForgotPasswordReturn {
    // Initialize state hook
    const stateProps = useForgotPasswordState();
    const { state, setEmail, setCode, setNewPassword, setConfirmPassword, goBack, reset } = stateProps;

    // Initialize validation hook
    const validation = useForgotPasswordValidation();
    const { validateEmail, validateCode, validatePasswords } = validation;

    // Initialize submission hook
    const { requestReset, verifyCode, resetPassword, resendCode } = useForgotPasswordSubmission(stateProps, validation);

    // Wrappers for validation functions to match the original interface which didn't take args
    // The original interface exposed validation functions that used the current state
    const validateEmailWrapper = () => validateEmail(state.email);
    const validateCodeWrapper = () => validateCode(state.code);
    const validatePasswordsWrapper = () => validatePasswords(state.newPassword, state.confirmPassword);

    return {
        ...state,
        setEmail,
        setCode,
        setNewPassword,
        setConfirmPassword,
        requestReset,
        verifyCode,
        resetPassword,
        resendCode,
        goBack,
        reset,
        validateEmail: validateEmailWrapper,
        validateCode: validateCodeWrapper,
        validatePasswords: validatePasswordsWrapper,
    };
}

export default useForgotPassword;

