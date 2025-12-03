import { z } from 'zod';

// Email validation schema
export const emailSchema = z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('البريد الإلكتروني غير صالح')
    .max(255, 'البريد الإلكتروني طويل جداً')
    .transform((email) => email.trim().toLowerCase());

// Password validation schema
export const passwordSchema = z
    .string()
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً')
    .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
    .regex(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
    .regex(/[^A-Za-z0-9]/, 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');

// Name validation schema
export const nameSchema = z
    .string()
    .min(1, 'الاسم مطلوب')
    .max(100, 'الاسم طويل جداً')
    .regex(/^[\u0600-\u06FFa-zA-Z\s]+$/, 'الاسم يجب أن يحتوي على أحرف فقط')
    .optional();

// Login schema
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'كلمة المرور مطلوبة'), // Less strict for login to allow legacy passwords or just checking existence
    rememberMe: z.boolean().optional().default(false),
    deviceFingerprint: z.any().optional(),
    captchaToken: z.string().optional(),
});

// Register schema
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'رمز إعادة التعيين مطلوب'),
    password: passwordSchema,
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});
