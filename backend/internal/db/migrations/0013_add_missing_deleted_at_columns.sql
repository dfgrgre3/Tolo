-- Migration: 0013_add_missing_deleted_at_columns.sql
-- Purpose: Add deleted_at columns for soft delete support across all tables
-- Date: 2026-05-05
-- Description: Idempotent addition of deleted_at columns with indexes

BEGIN;

-- ============================================================
-- Helper function to safely add deleted_at column
-- ============================================================
CREATE OR REPLACE FUNCTION safe_add_deleted_at(target_table TEXT)
RETURNS void AS $$
DECLARE
    table_exists BOOLEAN;
    col_exists BOOLEAN;
BEGIN
    -- First check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_name = target_table
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE NOTICE 'Table % does not exist, skipping', target_table;
        RETURN;
    END IF;

    -- Check if deleted_at column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = target_table AND c.column_name = 'deleted_at'
    ) INTO col_exists;

    IF NOT col_exists THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN "deleted_at" TIMESTAMPTZ', target_table);
        EXECUTE format('COMMENT ON COLUMN %I."deleted_at" IS ''Soft delete timestamp - NULL means active''', target_table);
        RAISE NOTICE 'Added deleted_at to table %', target_table;
    ELSE
        RAISE NOTICE 'deleted_at already exists on table %', target_table;
    END IF;

    -- Create index for soft delete queries
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_deleted_at ON %I ("deleted_at")',
        target_table, target_table
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Add deleted_at to all core tables
-- ============================================================

-- Content tables
SELECT safe_add_deleted_at('Category');
SELECT safe_add_deleted_at('Subject');
SELECT safe_add_deleted_at('Topic');
SELECT safe_add_deleted_at('SubTopic');
SELECT safe_add_deleted_at('LessonAttachment');

-- User-related tables
SELECT safe_add_deleted_at('UserSettings');
SELECT safe_add_deleted_at('SubjectEnrollment');
SELECT safe_add_deleted_at('TopicProgress');
SELECT safe_add_deleted_at('Schedule');
SELECT safe_add_deleted_at('Reminder');
SELECT safe_add_deleted_at('StudySession');
SELECT safe_add_deleted_at('Task');

-- Payment & Financial tables
SELECT safe_add_deleted_at('Payment');
SELECT safe_add_deleted_at('Invoice');
SELECT safe_add_deleted_at('WalletTransaction');
SELECT safe_add_deleted_at('Coupon');
SELECT safe_add_deleted_at('UserSubscription');
SELECT safe_add_deleted_at('SubscriptionPlan');

-- Exam & Assessment tables
SELECT safe_add_deleted_at('Exam');
SELECT safe_add_deleted_at('Question');
SELECT safe_add_deleted_at('ExamResult');

-- Communication & System tables
SELECT safe_add_deleted_at('Notification');
SELECT safe_add_deleted_at('SecurityLog');
SELECT safe_add_deleted_at('Session');
SELECT safe_add_deleted_at('CourseReview');

-- Gamification tables
SELECT safe_add_deleted_at('Achievement');
SELECT safe_add_deleted_at('Reward');
SELECT safe_add_deleted_at('Season');
SELECT safe_add_deleted_at('Challenge');
SELECT safe_add_deleted_at('UserAchievement');
SELECT safe_add_deleted_at('UserChallenge');

-- Marketing & Content tables
SELECT safe_add_deleted_at('BlogPost');
SELECT safe_add_deleted_at('ForumCategory');
SELECT safe_add_deleted_at('ForumTopic');
SELECT safe_add_deleted_at('LiveEvent');
SELECT safe_add_deleted_at('Book');
SELECT safe_add_deleted_at('Contest');
SELECT safe_add_deleted_at('Event');
SELECT safe_add_deleted_at('Campaign');

-- System tables
SELECT safe_add_deleted_at('SystemSetting');
SELECT safe_add_deleted_at('Automation');
SELECT safe_add_deleted_at('ABExperiment');
SELECT safe_add_deleted_at('AuditLog');
SELECT safe_add_deleted_at('AIConversation');
SELECT safe_add_deleted_at('ScheduledItem');
SELECT safe_add_deleted_at('Backup');
SELECT safe_add_deleted_at('SupportTicket');

-- ============================================================
-- Drop helper function
-- ============================================================
DROP FUNCTION IF EXISTS safe_add_deleted_at(TEXT);

-- ============================================================
-- Create partial indexes for common "active only" queries
-- ============================================================

-- User: Active users by email (only if email column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'User' AND c.column_name = 'email'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_active_email
        ON "User" (email)
        WHERE "deleted_at" IS NULL;
    END IF;
END $$;

-- Payment: Active payments by user (only if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'Payment' AND c.column_name = 'user_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'Payment' AND c.column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_payment_active_user_created
        ON "Payment" (user_id, created_at DESC)
        WHERE "deleted_at" IS NULL;
    END IF;
END $$;

-- Subject: Active published subjects (only if columns exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'Subject' AND c.column_name = 'is_published'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'Subject' AND c.column_name = 'is_active'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'Subject' AND c.column_name = 'level'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'Subject' AND c.column_name = 'category_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_subject_active_published
        ON "Subject" ("is_published", "is_active", level, category_id)
        WHERE "deleted_at" IS NULL;
    END IF;
END $$;

-- Notification: Active unread notifications (only if is_read column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'Notification' AND c.column_name = 'is_read'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_notification_active_unread
        ON "Notification" (user_id, "is_read", created_at DESC)
        WHERE "deleted_at" IS NULL;
    END IF;
END $$;

-- ============================================================
-- Create helper function for soft delete
-- ============================================================
CREATE OR REPLACE FUNCTION soft_delete_record(table_name TEXT, record_id UUID)
RETURNS void AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET "deleted_at" = NOW() WHERE id = $1',
        table_name
    ) USING record_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Create helper function to restore soft-deleted records
-- ============================================================
CREATE OR REPLACE FUNCTION restore_soft_deleted(table_name TEXT, record_id UUID)
RETURNS void AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET "deleted_at" = NULL WHERE id = $1',
        table_name
    ) USING record_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Create view for active users (convenience)
-- ============================================================
DROP VIEW IF EXISTS "ActiveUsers";
CREATE VIEW "ActiveUsers" AS
SELECT * FROM "User" 
WHERE "deleted_at" IS NULL;

COMMIT;

-- ============================================================
-- Post-migration notes:
-- ============================================================
-- All tables now support soft delete via GORM's DeletedAt type
-- GORM will automatically add "deleted_at IS NULL" to queries
-- Use .Unscoped() to include deleted records in queries
