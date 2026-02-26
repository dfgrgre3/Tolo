/**
 * Client-Side Logger - Unified Shim
 * هذا الملف يُعيد تصدير اللوجر الموحد للحفاظ على التوافق مع الكود الموجود.
 * لا تستخدم هذا الملف في كود جديد - استخدم '@/lib/logger' مباشرة.
 *
 * @deprecated Use `import { logger } from '@/lib/logger'` instead.
 */

export type { LogLevel, LogContext } from '@/lib/logging/unified-logger';
export { logger as clientLogger, logger as default } from '@/lib/logging/unified-logger';

