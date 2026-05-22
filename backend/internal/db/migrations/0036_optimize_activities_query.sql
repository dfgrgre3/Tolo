-- ============================================================
-- Migration 0036: Optimize recent activities query
-- Adds a COVERING index that satisfies the GetRecentActivities
-- SELECT list without a second heap-fetch (Index Only Scan),
-- and refreshes planner statistics so Postgres picks the index.
-- ============================================================

-- Covering index: satisfies WHERE user_id = ? ORDER BY created_at DESC
-- and returns id, title, message, type, is_read, created_at directly
-- from the index (Index Only Scan) without a heap fetch.
-- INCLUDE columns are stored but not used for ordering / filtering.
DROP INDEX IF EXISTS idx_notifications_user_created_covering;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_covering
    ON "Notification" (user_id, created_at DESC)
    INCLUDE (id, title, message, type, is_read);

-- Partial covering index for unread notifications count query
-- (used by GetUnreadNotificationsCount and user stats panel)
DROP INDEX IF EXISTS idx_notifications_unread_covering;
CREATE INDEX IF NOT EXISTS idx_notifications_unread_covering
    ON "Notification" (user_id)
    INCLUDE (is_read, created_at)
    WHERE is_read = false;

-- Refresh planner statistics so the query planner immediately
-- picks up the new indexes without waiting for auto-analyze.
ANALYZE "Notification";
