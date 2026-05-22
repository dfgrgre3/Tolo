-- ============================================================
-- Additional Performance Optimization Indexes
-- Migration 0035
-- Completes missing indexes identified from slow query analysis:
--   1. Category queries with type + created_at for ORDER BY
--   2. Users table: fast lookup for hydrateUserContext (id + role + permissions)
--   3. Subjects table: missing categoryId FK index (for N+1 count queries)
--   4. UserSession: cleanup old sessions and index for user queries
--   5. Enrollment: faster checks for isAlreadyEnrolled
-- ============================================================

-- 1. Category: تحسين استعلامات التصنيف مع الترتيب
-- يدعم الـ ORDER BY created_at desc بعد WHERE type = ?
DROP INDEX IF EXISTS idx_category_type_created;
CREATE INDEX IF NOT EXISTS idx_category_type_created
    ON "Category" (type, created_at DESC);

-- 2. Subjects: إضافة Index على categoryId للـ N+1 queries
-- يستخدم في GetCategoriesForAdmin لعملية COUNT(*) GROUP BY
CREATE INDEX IF NOT EXISTS idx_subject_category_id
    ON "Subject" (category_id);

-- 3. UserSession: إضافة Index للاستعلامات المتكررة على user_id
CREATE INDEX IF NOT EXISTS idx_user_session_user_active
    ON "UserSession" (user_id, is_active DESC)
    WHERE is_active = true;

-- 4. Enrollment: إضافة Index لسرعة التحقق من التسجيل المسبق
-- يستخدم في isAlreadyEnrolled و ManualEnroll
CREATE INDEX IF NOT EXISTS idx_enrollment_user_subject_unique
    ON "SubjectEnrollment" (user_id, subject_id);

-- 5. إضافة Index لجدول Users لدعم البحث السريع بـ id, role
-- (اختياري لكن مفيد لـ hydrateUserContext)
CREATE INDEX IF NOT EXISTS idx_user_id_role_perms
    ON "User" (id) INCLUDE (role, permissions);

-- 6. تحديث إحصاءات الجداول لضمان استخدام Planner للـ Indexes الجديدة
ANALYZE;