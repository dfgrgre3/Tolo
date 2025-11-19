/**
 * ⭐ SINGLE SOURCE OF TRUTH FOR PRISMA CLIENT - المصدر الوحيد الموثوق لعميل Prisma
 * 
 * ⚠️ CRITICAL: This file is the RECOMMENDED entry point for all Prisma Client usage.
 * ⚠️ CRITICAL: هذا الملف هو نقطة الدخول الموصى بها لجميع استخدامات Prisma Client.
 * 
 * ⚠️ CRITICAL: NEVER import PrismaClient directly from '@prisma/client' in application code!
 * ⚠️ CRITICAL: لا تستورد PrismaClient مباشرة من '@prisma/client' في كود التطبيق!
 * 
 * ⚠️ CRITICAL: NEVER create new PrismaClient() instances anywhere else!
 * ⚠️ CRITICAL: لا تنشئ نسخ جديدة من PrismaClient في أي مكان آخر!
 * 
 * ✅ This file re-exports from db-unified.ts which creates the singleton instance.
 * ✅ هذا الملف يعيد التصدير من db-unified.ts الذي ينشئ النسخة الوحيدة.
 * 
 * 📋 Purpose: Provides a unified entry point for all Prisma Client usage.
 * 📋 الغرض: يوفر نقطة دخول موحدة لجميع استخدامات Prisma Client.
 * 
 * ✅ All Prisma clients are sourced from db-unified.ts to ensure a single connection pool.
 * ✅ جميع عملاء Prisma مصدرهم db-unified.ts لضمان pool اتصال واحد فقط.
 * 
 * ❌ Creating multiple Prisma Client instances leads to "Too many connections" errors.
 * ❌ إنشاء نسخ متعددة من Prisma Client يؤدي إلى خطأ "Too many connections".
 * 
 * 📝 Usage (RECOMMENDED):
 * 📝 الاستخدام (الموصى به):
 *   - ✅ import { prisma } from '@/lib/prisma' (RECOMMENDED - use this!)
 *   - This will use the singleton instance from db-unified.ts
 *   - لا ينشئ نسخة جديدة، يستخدم النسخة الوحيدة من db-unified.ts
 * 
 * 🔄 Alternative imports (for backward compatibility):
 * 🔄 الاستيرادات البديلة (للتوافق مع الكود القديم):
 *   - import { prisma } from '@/lib/db' (also re-exports from db-unified.ts)
 *   - import { prisma } from '@/lib/db-unified' (direct, but not recommended)
 * 
 * ⚠️ DEPRECATED: getPrisma() and enhancedPrisma are deprecated
 * ⚠️ Always use direct import: import { prisma } from '@/lib/prisma'
 * 
 * 🔍 To check for conflicts, run: grep -r "new PrismaClient" src/
 * 🔍 للتحقق من التضارب، نفذ: grep -r "new PrismaClient" src/
 */

// Runtime check to ensure this only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Prisma can only be used on the server');
}

// ⚠️ CRITICAL: This file ONLY re-exports - it does NOT create Prisma Client instances
// ⚠️ CRITICAL: هذا الملف يعيد التصدير فقط - لا ينشئ نسخ جديدة من Prisma Client
// 
// ✅ All Prisma clients come from db-unified.ts (which creates the singleton)
// ✅ جميع عملاء Prisma تأتي من db-unified.ts (الذي ينشئ النسخة الوحيدة)
// 
// ✅ This is the RECOMMENDED entry point for all Prisma Client usage
// ✅ هذا هو نقطة الدخول الموصى بها لجميع استخدامات Prisma Client
// 
// ❌ DO NOT import PrismaClient from '@prisma/client' here!
// ❌ لا تستورد PrismaClient من '@prisma/client' هنا!
// 
// ❌ DO NOT create new PrismaClient() instances here!
// ❌ لا تنشئ نسخ جديدة من PrismaClient() هنا!

// Re-export Prisma client directly from db-unified.ts (synchronous, same instance)
// This ensures we use the same singleton instance and avoid "Too many connections" errors
export { prisma, default as prismaDefault } from './db-unified';

// ⚠️ DEPRECATED: getPrisma() and enhancedPrisma are deprecated
// ⚠️ Use direct import instead: import { prisma } from '@/lib/prisma'
// ⚠️ This maintains backward compatibility but should be migrated
let prismaInstance: any = null;

async function getPrismaInstance() {
  if (!prismaInstance) {
    // Import the prisma instance from db-unified (same singleton)
    const dbUnifiedModule = await import('./db-unified');
    prismaInstance = dbUnifiedModule.prisma;
  }
  return prismaInstance;
}

// ⚠️ DEPRECATED: Use direct import instead: import { prisma } from '@/lib/prisma'
// This is kept for backward compatibility only
export async function getPrisma() {
  return getPrismaInstance();
}

// ⚠️ DEPRECATED: enhancedPrisma is deprecated, use prisma instead
// Re-export for backward compatibility only
export { enhancedPrisma } from './db-unified';

// ✅ Export connection pool management functions (recommended)
export { getConnectionPoolStats, optimizeConnectionPool } from './db-unified';