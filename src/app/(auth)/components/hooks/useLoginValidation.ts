import { z } from 'zod';
import { LoginFormData, FieldErrors } from '../types/login-form.types';
import { LOGIN_ERRORS } from '@/lib/auth/login-errors';

const loginSchema = z.object({
    email: z
        .string()
        .min(1, LOGIN_ERRORS.MISSING_EMAIL)
        .email(LOGIN_ERRORS.INVALID_EMAIL_FORMAT)
        .max(254, LOGIN_ERRORS.INVALID_EMAIL_FORMAT)
        .refine((email) => !email.includes('..') && !email.startsWith('.') && !email.endsWith('.'), {
            message: LOGIN_ERRORS.INVALID_EMAIL_FORMAT,
        }),
    password: z
        .string()
        .min(1, LOGIN_ERRORS.INVALID_CREDENTIALS) // Generic message for security
        .min(8, LOGIN_ERRORS.PASSWORD_TOO_SHORT)
        .max(128, LOGIN_ERRORS.PASSWORD_TOO_LONG),
});

export const useLoginValidation = () => {
    const validateForm = (formData: LoginFormData): { isValid: boolean; errors: FieldErrors } => {
        const result = loginSchema.safeParse(formData);

        if (!result.success) {
            const errors: FieldErrors = {};
            result.error.issues.forEach((issue) => {
                const path = issue.path[0] as keyof FieldErrors;
                if (path) {
                    errors[path] = issue.message;
                }
            });
            return { isValid: false, errors };
        }

        return { isValid: true, errors: {} };
    };

    const validateTwoFactorCode = (code: string): boolean => {
        return code.length === 6 && /^\d{6}$/.test(code);
    };

    return {
        validateForm,
        validateTwoFactorCode,
    };
};
