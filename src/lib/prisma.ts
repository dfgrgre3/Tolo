/**
 * Prisma Client compatibility module - وحدات التوافق لعميل Prisma
 * 
 * ⚠️ CRITICAL: This file does NOT create Prisma Client instances.
 * ⚠️ CRITICAL: هذا الملف لا ينشئ نسخ جديدة من Prisma Client.
 * 
 * ⚠️ CRITICAL: NEVER import PrismaClient directly from '@prisma/client' in application code!
 * ⚠️ CRITICAL: لا تستورد PrismaClient مباشرة من '@prisma/client' في كود التطبيق!
 * 
 * ⚠️ CRITICAL: NEVER create new PrismaClient() instances anywhere else!
 * ⚠️ CRITICAL: لا تنشئ نسخ جديدة من PrismaClient في أي مكان آخر!
 * 
 * ✅ This file ONLY re-exports from db-unified.ts (single source of truth).
 * ✅ هذا الملف يعيد التصدير فقط من db-unified.ts (المصدر الوحيد الموثوق).
 * 
 * 📋 Purpose: Provides backward compatibility for code that imports from '@/lib/prisma'.
 * 📋 الغرض: يوفر التوافق للكود الذي يستورد من '@/lib/prisma'.
 * 
 * ✅ All Prisma clients are sourced from db-unified.ts to ensure a single connection pool.
 * ✅ جميع عملاء Prisma مصدرهم db-unified.ts لضمان pool اتصال واحد فقط.
 * 
 * ❌ Creating multiple Prisma Client instances leads to "Too many connections" errors.
 * ❌ إنشاء نسخ متعددة من Prisma Client يؤدي إلى خطأ "Too many connections".
 * 
 * 📝 Usage:
 * 📝 الاستخدام:
 *   - Import: import { prisma } from '@/lib/prisma'
 *   - This will use the singleton instance from db-unified.ts
 *   - لا ينشئ نسخة جديدة، يستخدم النسخة الوحيدة من db-unified.ts
 * 
 * 🔄 For new code, you can also use:
 * 🔄 للكود الجديد، يمكنك أيضاً استخدام:
 *   - import { prisma } from '@/lib/db-unified' (direct)
 *   - import { prisma } from '@/lib/db' (also re-exports from db-unified.ts)
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
// ✅ All Prisma clients come from db-unified.ts (single source of truth)
// ✅ جميع عملاء Prisma تأتي من db-unified.ts (المصدر الوحيد الموثوق)
// 
// ❌ DO NOT import PrismaClient from '@prisma/client' here!
// ❌ لا تستورد PrismaClient من '@prisma/client' هنا!
// 
// ❌ DO NOT create new PrismaClient() instances here!
// ❌ لا تنشئ نسخ جديدة من PrismaClient() هنا!

// Re-export Prisma clients directly from db-unified.ts (synchronous, same instance)
// This ensures we use the same singleton instance and avoid "Too many connections" errors
export { prisma, enhancedPrisma, default as prismaDefault } from './db-unified';

// For backward compatibility with async getPrisma() function
// This is kept for code that uses: const prisma = await getPrisma();
// However, direct import is now preferred: import { prisma } from '@/lib/prisma'
let prismaInstance: any = null;

async function getPrismaInstance() {
  if (!prismaInstance) {
    // Import the prisma instance from db-unified (same singleton)
    const dbUnifiedModule = await import('./db-unified');
    prismaInstance = dbUnifiedModule.enhancedPrisma;
  }
  return prismaInstance;
}

// Export async getter function for backward compatibility
// NOTE: Direct import is preferred: import { prisma } from '@/lib/prisma'
export async function getPrisma() {
  return getPrismaInstance();
}
