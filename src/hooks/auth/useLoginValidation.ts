import { loginSchema } from '@/lib/validations/auth';
import { LoginFormData, FieldErrors } from '@/types/auth-form';

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
