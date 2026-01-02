import { useCallback } from 'react';
import { ForgotPasswordState } from './useForgotPasswordState';

export const useForgotPasswordValidation = () => {
    const validateEmail = useCallback((email: string): string | null => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            return 'البريد الإلكتروني مطلوب';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return 'البريد الإلكتروني غير صحيح';
        }
        return null;
    }, []);

    const validateCode = useCallback((code: string): string | null => {
        if (!code) {
            return 'رمز التحقق مطلوب';
        }
        if (code.length !== 6) {
            return 'رمز التحقق يجب أن يكون 6 أرقام';
        }
        return null;
    }, []);

    const validatePasswords = useCallback((newPassword: string, confirmPassword: string): { password: string | null; confirm: string | null } => {
        const errors = { password: null as string | null, confirm: null as string | null };

        if (!newPassword) {
            errors.password = 'كلمة المرور مطلوبة';
        } else if (newPassword.length < 8) {
            errors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
        } else if (!/[A-Z]/.test(newPassword)) {
            errors.password = 'يجب أن تحتوي على حرف كبير واحد على الأقل';
        } else if (!/[a-z]/.test(newPassword)) {
            errors.password = 'يجب أن تحتوي على حرف صغير واحد على الأقل';
        } else if (!/[0-9]/.test(newPassword)) {
            errors.password = 'يجب أن تحتوي على رقم واحد على الأقل';
        }

        if (!confirmPassword) {
            errors.confirm = 'تأكيد كلمة المرور مطلوب';
        } else if (newPassword !== confirmPassword) {
            errors.confirm = 'كلمتا المرور غير متطابقتين';
        }

        return errors;
    }, []);

    return {
        validateEmail,
        validateCode,
        validatePasswords,
    };
};
