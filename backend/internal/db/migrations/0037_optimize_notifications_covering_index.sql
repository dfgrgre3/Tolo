-- ============================================================
-- Migration 0037: Upgrade notifications covering index
-- Adds 'link' and 'icon' to the covering index to satisfy
-- SELECT list in GetNotifications without heap-fetches.
-- ============================================================

DROP INDEX IF EXISTS idx_notifications_user_created_covering;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_covering
    ON "Notification" (user_id, created_at DESC)
    INCLUDE (id, title, message, type, is_read, link, icon);

ANALYZE "Notification";
