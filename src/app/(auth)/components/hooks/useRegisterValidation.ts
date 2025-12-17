import { z } from 'zod';
import { toast } from 'sonner';
import { getPasswordStrengthDisplay } from '@/app/(auth)/components/utils/password-strength';
import { RegisterFormData } from './types';


export const useRegisterValidation = () => {
    const validateForm = (formData: RegisterFormData): { isValid: boolean; errors: Record<string, string> } => {
        const registerSchema = z.object({
            name: z
                .string()
                .min(2, 'الاسم يجب أن يكون على الأقل حرفين')
                .max(100, 'الاسم طويل جداً (الحد الأقصى 100 حرف)'),
            email: z
                .string()
                .min(1, 'يرجى إدخال البريد الإلكتروني')
                .email('البريد الإلكتروني غير صالح. يرجى إدخال بريد إلكتروني صحيح')
                .max(255, 'البريد الإلكتروني طويل جداً'),
            password: z
                .string()
                .min(8, 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل')
                .max(128, 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)')
                .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)')
                .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)')
                .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)')
                .regex(/[!@#$%^&*(),.?":{}|<>]/, 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%...)'),
            confirmPassword: z.string(),
            acceptTerms: z.literal(true, {
                errorMap: () => ({ message: 'يجب الموافقة على الشروط والأحكام لإنشاء الحساب' }),
            }),
        }).refine((data) => data.password === data.confirmPassword, {
            message: 'كلمات المرور غير متطابقة. يرجى التأكد من تطابق كلمة المرور',
            path: ['confirmPassword'],
        });

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
