-- ============================================================
-- Migration 0042: Fix logged slow requests from production traces
-- ============================================================

BEGIN;

-- Subject list/count queries always carry GORM soft-delete predicates.
-- These partial indexes keep COUNT(*) and the default created_at listing off
-- the full table when /api/courses has no filters.
CREATE INDEX IF NOT EXISTS idx_subject_active_rows
    ON "Subject" (id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subject_created_active
    ON "Subject" (created_at DESC, id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subject_category_created_active
    ON "Subject" (category_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subject_level_created_active
    ON "Subject" (level, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subject_published_created_active
    ON "Subject" (is_published, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subject_is_active_created_active
    ON "Subject" (is_active, created_at DESC)
    WHERE deleted_at IS NULL;

-- Matches the slow refresh-token rotation predicate:
-- WHERE id = ? AND refresh_token_hash = ? AND is_active = true.
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_refresh
    ON "UserSession" (id, refresh_token_hash, is_active)
    WHERE is_active = true AND deleted_at IS NULL;

-- Forum compatibility endpoints are public and list ordered rows.
CREATE INDEX IF NOT EXISTS idx_forum_category_order_active
    ON "ForumCategory" ("order" ASC, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_forum_topic_pinned_created_active
    ON "ForumTopic" (is_pinned DESC, created_at DESC)
    INCLUDE (id, title, author_id, category_id, views, is_locked)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_forum_topic_category_created_active
    ON "ForumTopic" (category_id, created_at DESC)
    WHERE deleted_at IS NULL;

ANALYZE "Subject";
ANALYZE "UserSession";
ANALYZE "ForumCategory";
ANALYZE "ForumTopic";

COMMIT;
