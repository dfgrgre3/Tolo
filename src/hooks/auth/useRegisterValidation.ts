import { registerSchema } from '@/lib/validations/auth';
import { toast } from 'sonner';
import { getPasswordStrengthDisplay } from '@/lib/auth/password-strength';
import { RegisterFormData } from '@/types/auth-form';


export const useRegisterValidation = () => {


    const validateForm = (formData: RegisterFormData): { isValid: boolean; errors: Record<string, string> } => {
        const result = registerSchema.safeParse(formData);

        if (!result.success) {
            const errors: Record<string, string> = {};
            result.error.issues.forEach((issue) => {
                if (issue.path.length > 0) {
                    errors[issue.path[0] as string] = issue.message;
                }
            });

            return { isValid: false, errors };
        }

        // Additional check for password strength score
        const passwordStrength = getPasswordStrengthDisplay(formData.password);
        if (passwordStrength.score < 40) {
            return {
                isValid: false,
                errors: { password: 'كلمة المرور ضعيفة. يجب أن تستوفي جميع المتطلبات' }
            };
        }

        return { isValid: true, errors: {} };
    };

    return { validateForm };
};
