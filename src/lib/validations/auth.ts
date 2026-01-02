import { z } from "zod";

export const emailSchema = z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email({ message: "البريد الإلكتروني غير صالح" })
    .transform((email) => email.trim().toLowerCase());

export const passwordSchema = z
    .string()
    .min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" })
    .max(128, { message: 'كلمة المرور طويلة جداً' })
    .regex(/[A-Z]/, { message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل' })
    .regex(/[a-z]/, { message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل' })
    .regex(/[0-9]/, { message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' });

export const nameSchema = z
    .string()
    .min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" })
    .max(100, { message: 'الاسم طويل جداً' })
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, { message: 'الاسم يجب أن يحتوي على أحرف فقط' });

export const resetTokenSchema = z.string().min(1, { message: "رمز إعادة التعيين مطلوب" });
export const magicLinkSchema = z.string().email({ message: "البريد الإلكتروني غير صالح" });

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
    rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    acceptTerms: z.boolean().refine(val => val === true, {
        message: "يجب الموافقة على الشروط والأحكام"
    }).optional(),
}).refine((data) => {
    if (data.confirmPassword) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
