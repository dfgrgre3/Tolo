/**
 * ⭐ LEGACY DATABASE ENTRY POINT - نقطة دخول قاعدة البيانات القديمة
 *
 * ⚠️ DEPRECATED: This file is kept for backward compatibility only.
 * ⚠️ مهمل: هذا الملف محفوظ فقط للتوافق مع الإصدارات القديمة.
 *
 * ✅ RECOMMENDED: Use import { prisma } from '@/lib/prisma' instead.
 * ✅ موصى به: استخدم import { prisma } from '@/lib/prisma' بدلاً من ذلك.
 *
 * This file re-exports the prisma instance from db-unified.ts
 * هذا الملف يعيد تصدير نسخة prisma من db-unified.ts
 */

// Re-export prisma from db-unified.ts
export { prisma, default as prismaDefault } from './db-unified';

// Re-export Prisma namespace for JsonNull and other utilities
export { Prisma } from '@prisma/client';
