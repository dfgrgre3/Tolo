-- ============================================================
-- Performance Optimization Indexes
-- Migration 0034
-- Indices to speed up slow queries identified in logs:
--   1. Notifications queries (user_id, created_at DESC)
--   2. Unread notifications count (user_id, is_read)
--   3. Recent activities (user_id, created_at DESC)
--   4. Category queries with type filtering
--   5. Subject queries (category_id, created_at DESC)
--   6. Subject search (name, name_ar ILIKE)
-- ============================================================

-- 1. Notifications: تسريع استعلامات جلب الإشعارات والـ unread count
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON "Notification" (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read
    ON "Notification" (user_id, is_read)
    WHERE is_read = false;

-- 2. Subjects/Courses: تسريع التصفح والفرز والفلترة
CREATE INDEX IF NOT EXISTS idx_subject_category_created
    ON "Subject" (category_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subject_level
    ON "Subject" (level)
    WHERE level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subject_is_published
    ON "Subject" (is_published, created_at DESC)
    WHERE is_published = true;

-- 3. Full-text search على subjects
CREATE INDEX IF NOT EXISTS idx_subject_name_search
    ON "Subject" USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(name_ar, '')));

-- 4. Enrollment queries
CREATE INDEX IF NOT EXISTS idx_enrollment_user_subject
    ON "SubjectEnrollment" (user_id, subject_id);

-- 5. Activities/StudySessions queries
CREATE INDEX IF NOT EXISTS idx_study_session_user_created
    ON "StudySession" (user_id, created_at DESC);

-- 6. Payment queries
CREATE INDEX IF NOT EXISTS idx_payment_user_subject
    ON "Payment" (user_id, subject_id, status);

-- 7. Category queries
CREATE INDEX IF NOT EXISTS idx_category_type
    ON "Category" (type);

-- 8. AI Conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversation_user_created
    ON "AIConversation" (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_message_conversation_created
    ON "AIMessage" (conversation_id, created_at ASC);

-- 9. Tasks and Reminders
CREATE INDEX IF NOT EXISTS idx_task_user_created
    ON "Task" (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_user_remind_at
    ON "Reminder" (user_id, remind_at ASC);