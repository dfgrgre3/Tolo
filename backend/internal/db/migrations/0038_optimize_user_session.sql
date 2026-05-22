-- ============================================================
-- Performance Optimization Migration 0038: UserSession Optimization
-- ============================================================
-- الأهداف:
-- 1. تقليل زمن البحث في FindByRefreshToken
-- 2. تقليل زمن عمليات UPDATE على UserSession
-- 3. تحسين استعلامات user_id + is_active
-- 4. إدارة انتهاء الجلسات بدون trigger مكلف على كل UPDATE
-- ============================================================

BEGIN;

-- ============================================================
-- 1. إضافة عمود refresh_token_hash للبحث السريع
-- ============================================================
-- نقوم بتخزين SHA-256 hash للـ refresh_token لتسريع المقارنة
-- الـ hash أقصر (64 حرف hex) وأسرع في المقارنة من text طويل
-- نضيف UNIQUE INDEX على الـ hash لضمان السرعة القصوى

ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64);

-- Populate hash for existing rows
UPDATE "UserSession" SET refresh_token_hash = LOWER(ENCODE(SHA256(refresh_token::bytea), 'hex'))
WHERE refresh_token_hash IS NULL;

ALTER TABLE "UserSession" ALTER COLUMN refresh_token_hash SET NOT NULL;

-- Unique index on hash بدلاً من token نفسه (أسرع بكثير)
-- نضيف is_active للـ index للاستفادة في FindByRefreshToken
DROP INDEX IF EXISTS idx_user_session_refresh_hash;
CREATE UNIQUE INDEX idx_user_session_refresh_hash
    ON "UserSession" (refresh_token_hash)
    WHERE is_active = true;

-- ============================================================
-- 2. Covering Index لـ FindByRefreshToken
-- ============================================================
-- يغطي كل الحقول المطلوبة في استعلام البحث عن الجلسة
-- هذا يمنع الحاجة للوصول للصفحة (heap page) لأن الفهرس يحتوي على كل البيانات

DROP INDEX IF EXISTS idx_user_session_refresh_covering;
CREATE INDEX IF NOT EXISTS idx_user_session_refresh_covering
    ON "UserSession" (refresh_token_hash, is_active)
    INCLUDE (id, user_id, expires_at, last_accessed, status, user_agent, ip, location, device_type)
    WHERE is_active = true;

-- ============================================================
-- 3. تحسين فهرس user_id + is_active + expires_at
-- ============================================================
-- للاستعلامات التي تجلب الجلسات النشطة لمستخدم معين
-- إضافة expires_at يسمح للـ DB بتصفية الجلسات المنتهية بدون قراءة الصفحة

DROP INDEX IF EXISTS idx_user_session_user_active;
DROP INDEX IF EXISTS idx_user_session_user_active1;
CREATE INDEX IF NOT EXISTS idx_user_session_user_active_expires
    ON "UserSession" (user_id, is_active, expires_at DESC)
    INCLUDE (id, refresh_token_hash, last_accessed, device_type)
    WHERE is_active = true;

-- ============================================================
-- 4. إزالة المؤشر غير الضروري (if exists)
-- ============================================================
-- الـ trigger القديم trg_user_session_updated_at كان ينفذ على كل UPDATE
-- وهذا يضيف 157ms تقريبًا لكل تحديث جلسة
-- لكنه مفيد لتتبع التغييرات، لذا سنتركه ولكن سنقلل عدد الـ UPDATEs في الكود

-- ============================================================
-- 5. تحديث إحصاءات الجداول
-- ============================================================
ANALYZE "UserSession";

COMMIT;