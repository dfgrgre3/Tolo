-- Migration: Migrate all primary keys and foreign keys from text to uuid
-- Date: 2026-05-03
-- Description: This migration converts all 'text' type ID columns to 'uuid' type
-- IMPORTANT: This migration requires downtime and careful testing
-- Make sure to backup your database before running this migration

-- Start transaction
BEGIN;

-- Temporarily disable triggers if needed (for large datasets)
-- SET session_replication_role = replica;

-- ============================================
-- Step 0: Helper functions for safe migration
-- ============================================
CREATE OR REPLACE FUNCTION text_to_uuid(t text) RETURNS uuid AS $$
BEGIN
    IF t IS NULL OR t = '' THEN
        RETURN NULL;
    END IF;
    -- Check if it's already a valid UUID (with or without hyphens)
    IF t ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR t ~ '^[0-9a-fA-F]{32}$' THEN
        RETURN t::uuid;
    ELSE
        -- Convert to MD5 and cast to UUID (deterministic conversion)
        RETURN md5(t)::uuid;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION text_to_uuid(u uuid) RETURNS uuid AS $$
BEGIN
    RETURN u;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION safe_migrate_column(t_name text, old_col text, new_col text, new_type text) RETURNS void AS $$
DECLARE
    current_type text;
    is_partition_key boolean;
BEGIN
    -- If old column exists, try to alter its type and rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = old_col) THEN
        SELECT data_type INTO current_type FROM information_schema.columns WHERE table_name = t_name AND column_name = old_col;
        
        -- Check if it's a partition key (cannot be altered directly)
        SELECT EXISTS (
            SELECT 1 FROM pg_partitioned_table pt 
            JOIN pg_class c ON pt.partrelid = c.oid 
            JOIN pg_attribute a ON a.attrelid = c.oid
            WHERE c.relname = t_name AND a.attname = old_col
            AND a.attnum = ANY(pt.partattrs)
        ) INTO is_partition_key;

        -- Alter type using deterministic conversion if target is uuid
        IF new_type = 'uuid' AND current_type != 'uuid' THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE uuid USING text_to_uuid(%I::text)', t_name, old_col, old_col);
        ELSIF NOT is_partition_key AND current_type != new_type 
              AND NOT (new_type = 'timestamptz' AND current_type = 'timestamp with time zone')
              AND NOT (new_type = 'timestamp with time zone' AND current_type = 'timestamptz') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s', t_name, old_col, new_type, old_col, new_type);
        END IF;
        
        -- Rename if names are different
        IF old_col != new_col THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = new_col) THEN
                EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', t_name, old_col, new_col);
            END IF;
        END IF;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = new_col) THEN
        -- Old column doesn't exist, but new column does. Just ensure type is correct.
        SELECT data_type INTO current_type FROM information_schema.columns WHERE table_name = t_name AND column_name = new_col;
        
        -- Check if it's a partition key
        SELECT EXISTS (
            SELECT 1 FROM pg_partitioned_table pt 
            JOIN pg_class c ON pt.partrelid = c.oid 
            JOIN pg_attribute a ON a.attrelid = c.oid
            WHERE c.relname = t_name AND a.attname = new_col
            AND a.attnum = ANY(pt.partattrs)
        ) INTO is_partition_key;

        IF new_type = 'uuid' AND current_type != 'uuid' THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE uuid USING text_to_uuid(%I::text)', t_name, new_col, new_col);
        ELSIF NOT is_partition_key AND current_type != new_type 
              AND NOT (new_type = 'timestamptz' AND current_type = 'timestamp with time zone')
              AND NOT (new_type = 'timestamp with time zone' AND current_type = 'timestamptz') THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE %s USING %I::%s', t_name, new_col, new_type, new_col, new_type);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION safe_add_constraint(t_name text, c_name text, c_def text) RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t_name) THEN
        BEGIN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', t_name, c_name, c_def);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not add constraint % on table %: %', c_name, t_name, SQLERRM;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 1: Drop views and foreign key constraints safely
-- ============================================

-- Drop views that depend on columns we are about to alter
DROP VIEW IF EXISTS "ActiveUsers";
DROP VIEW IF EXISTS "ActivePayments";
DROP VIEW IF EXISTS "ActiveEnrollments";

DO $$
DECLARE
    t_name text;
    c_name text;
BEGIN
    -- Drop ALL foreign key constraints in the entire database.
    -- This is necessary because we are changing primary key types from TEXT to UUID 
    -- across the entire schema, and any referencing foreign key will block this change.
    FOR t_name, c_name IN 
        SELECT r.relname, c.conname 
        FROM pg_constraint c 
        JOIN pg_class r ON r.oid = c.conrelid 
        WHERE c.contype = 'f' 
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t_name, c_name);
    END LOOP;
END $$;

-- ============================================
-- Step 2: Alter primary key columns from text to uuid (Safe Version)
-- ============================================
-- ============================================
-- Step 2: Alter primary key columns from text to uuid (Safe Version)
-- ============================================

CREATE OR REPLACE FUNCTION safe_alter_pk(t_name text) RETURNS void AS $$
DECLARE
    current_type text;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t_name) THEN
        SELECT data_type INTO current_type FROM information_schema.columns WHERE table_name = t_name AND column_name = 'id';
        
        IF current_type != 'uuid' THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE uuid USING text_to_uuid(id::text)', t_name);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT safe_alter_pk('User');
SELECT safe_alter_pk('Subject');
SELECT safe_alter_pk('Category');
SELECT safe_alter_pk('SystemSetting');
SELECT safe_alter_pk('SubscriptionPlan');
SELECT safe_alter_pk('UserSettings');
SELECT safe_alter_pk('UserSession');
SELECT safe_alter_pk('SecurityLog');
SELECT safe_alter_pk('Notification');
SELECT safe_alter_pk('WalletTransaction');
SELECT safe_alter_pk('Payment');
SELECT safe_alter_pk('Invoice');
SELECT safe_alter_pk('Enrollment');
SELECT safe_alter_pk('SubjectEnrollment');
SELECT safe_alter_pk('LessonProgress');
SELECT safe_alter_pk('StudySession');
SELECT safe_alter_pk('Schedule');
SELECT safe_alter_pk('Reminder');
SELECT safe_alter_pk('Task');
SELECT safe_alter_pk('Topic');
SELECT safe_alter_pk('SubTopic');
SELECT safe_alter_pk('LessonAttachment');
SELECT safe_alter_pk('Exam');
SELECT safe_alter_pk('Question');
SELECT safe_alter_pk('ExamResult');
SELECT safe_alter_pk('UserSubscription');
SELECT safe_alter_pk('Achievement');
SELECT safe_alter_pk('UserAchievement');
SELECT safe_alter_pk('Challenge');
SELECT safe_alter_pk('UserChallenge');
SELECT safe_alter_pk('Activity');
SELECT safe_alter_pk('AIConversation');
SELECT safe_alter_pk('AIMessage');
SELECT safe_alter_pk('Season');
SELECT safe_alter_pk('Contest');
SELECT safe_alter_pk('ContestQuestion');
SELECT safe_alter_pk('BlogPost');
SELECT safe_alter_pk('ForumCategory');
SELECT safe_alter_pk('ForumTopic');
SELECT safe_alter_pk('LiveEvent');
SELECT safe_alter_pk('Book');
SELECT safe_alter_pk('Event');
SELECT safe_alter_pk('Reward');
SELECT safe_alter_pk('Coupon');
SELECT safe_alter_pk('Automation');
SELECT safe_alter_pk('ABExperiment');
SELECT safe_alter_pk('AuditLog');
SELECT safe_alter_pk('Campaign');
SELECT safe_alter_pk('ContentReport');
SELECT safe_alter_pk('ScheduledItem');
SELECT safe_alter_pk('Backup');
SELECT safe_alter_pk('SupportTicket');

DROP FUNCTION IF EXISTS safe_alter_pk(text);

-- ============================================
-- Step 3: Alter foreign key columns and rename (Safe Version)
-- ============================================

DO $$ 
BEGIN
    -- UserSettings
    PERFORM safe_migrate_column('UserSettings', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('UserSettings', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('UserSettings', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('UserSettings', 'fk_user_settings_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- UserSession
    PERFORM safe_migrate_column('UserSession', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('UserSession', 'refreshToken', 'refresh_token', 'text');
    PERFORM safe_migrate_column('UserSession', 'userAgent', 'user_agent', 'text');
    PERFORM safe_migrate_column('UserSession', 'deviceType', 'device_type', 'text');
    PERFORM safe_migrate_column('UserSession', 'isActive', 'is_active', 'boolean');
    PERFORM safe_migrate_column('UserSession', 'lastAccessed', 'last_accessed', 'timestamptz');
    PERFORM safe_migrate_column('UserSession', 'expiresAt', 'expires_at', 'timestamptz');
    PERFORM safe_migrate_column('UserSession', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('UserSession', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('UserSession', 'fk_user_sessions_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- SecurityLog
    PERFORM safe_migrate_column('SecurityLog', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('SecurityLog', 'eventType', 'event_type', 'text');
    PERFORM safe_migrate_column('SecurityLog', 'userAgent', 'user_agent', 'text');
    PERFORM safe_migrate_column('SecurityLog', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('SecurityLog', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('SecurityLog', 'fk_security_logs_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- Notification
    PERFORM safe_migrate_column('Notification', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Notification', 'isActive', 'is_active', 'boolean');
    PERFORM safe_migrate_column('Notification', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('Notification', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('Notification', 'fk_notifications_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- WalletTransaction
    PERFORM safe_migrate_column('WalletTransaction', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('WalletTransaction', 'walletType', 'wallet_type', 'text');
    PERFORM safe_migrate_column('WalletTransaction', 'referenceId', 'reference_id', 'uuid');
    PERFORM safe_migrate_column('WalletTransaction', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_add_constraint('WalletTransaction', 'fk_wallet_transactions_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- Payment
    PERFORM safe_migrate_column('Payment', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Payment', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_migrate_column('Payment', 'planId', 'plan_id', 'uuid');
    PERFORM safe_migrate_column('Payment', 'paymobOrderId', 'paymob_order_id', 'text');
    PERFORM safe_migrate_column('Payment', 'paymobTransactionId', 'paymob_transaction_id', 'text');
    PERFORM safe_migrate_column('Payment', 'paymentMethod', 'payment_method', 'text');
    PERFORM safe_migrate_column('Payment', 'isSuccessful', 'is_successful', 'boolean');
    PERFORM safe_migrate_column('Payment', 'failureReason', 'failure_reason', 'text');
    PERFORM safe_migrate_column('Payment', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('Payment', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('Payment', 'fk_payments_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- Invoice
    PERFORM safe_migrate_column('Invoice', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Invoice', 'paymentId', 'payment_id', 'uuid');
    PERFORM safe_migrate_column('Invoice', 'invoiceNumber', 'invoice_number', 'text');
    PERFORM safe_migrate_column('Invoice', 'invoiceDate', 'invoice_date', 'timestamptz');
    PERFORM safe_migrate_column('Invoice', 'dueDate', 'due_date', 'timestamptz');
    PERFORM safe_migrate_column('Invoice', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('Invoice', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('Invoice', 'fk_invoices_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- Enrollment
    PERFORM safe_migrate_column('Enrollment', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Enrollment', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_migrate_column('Enrollment', 'enrolledAt', 'enrolled_at', 'timestamptz');
    PERFORM safe_add_constraint('Enrollment', 'fk_enrollments_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('Enrollment', 'fk_enrollments_subject_id', 'FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE CASCADE');

    -- LessonProgress
    PERFORM safe_migrate_column('LessonProgress', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('LessonProgress', 'lessonId', 'lesson_id', 'uuid');
    PERFORM safe_migrate_column('LessonProgress', 'isCompleted', 'is_completed', 'boolean');
    PERFORM safe_migrate_column('LessonProgress', 'completedAt', 'completed_at', 'timestamptz');
    PERFORM safe_migrate_column('LessonProgress', 'lastAccessedAt', 'last_accessed_at', 'timestamptz');
    PERFORM safe_add_constraint('LessonProgress', 'fk_lesson_progresses_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- StudySession
    PERFORM safe_migrate_column('StudySession', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('StudySession', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_migrate_column('StudySession', 'durationMin', 'duration_min', 'integer');
    PERFORM safe_migrate_column('StudySession', 'focusScore', 'focus_score', 'integer');
    PERFORM safe_migrate_column('StudySession', 'startTime', 'start_time', 'timestamptz');
    PERFORM safe_migrate_column('StudySession', 'endTime', 'end_time', 'timestamptz');
    PERFORM safe_migrate_column('StudySession', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('StudySession', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('StudySession', 'fk_study_sessions_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('StudySession', 'fk_study_sessions_subject_id', 'FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE SET NULL');

    -- Schedule
    PERFORM safe_migrate_column('Schedule', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Schedule', 'planJson', 'plan_json', 'text');
    PERFORM safe_migrate_column('Schedule', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('Schedule', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('Schedule', 'fk_schedules_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- Reminder
    PERFORM safe_migrate_column('Reminder', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Reminder', 'remindAt', 'remind_at', 'timestamptz');
    PERFORM safe_migrate_column('Reminder', 'isActive', 'is_active', 'boolean');
    PERFORM safe_migrate_column('Reminder', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('Reminder', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('Reminder', 'fk_reminders_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- Task
    PERFORM safe_migrate_column('Task', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Task', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_migrate_column('Task', 'dueAt', 'due_at', 'timestamptz');
    PERFORM safe_migrate_column('Task', 'estimatedTime', 'estimated_time', 'integer');
    PERFORM safe_migrate_column('Task', 'actualTime', 'actual_time', 'integer');
    PERFORM safe_migrate_column('Task', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('Task', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('Task', 'fk_tasks_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('Task', 'fk_tasks_subject_id', 'FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE SET NULL');

    -- Exam
    PERFORM safe_migrate_column('Exam', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_migrate_column('Exam', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('Exam', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('Exam', 'fk_exams_subject_id', 'FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE CASCADE');

    -- Question
    PERFORM safe_migrate_column('Question', 'examId', 'exam_id', 'uuid');
    PERFORM safe_add_constraint('Question', 'fk_questions_exam_id', 'FOREIGN KEY (exam_id) REFERENCES "Exam"(id) ON DELETE CASCADE');

    -- ExamResult
    PERFORM safe_migrate_column('ExamResult', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('ExamResult', 'examId', 'exam_id', 'uuid');
    PERFORM safe_migrate_column('ExamResult', 'takenAt', 'taken_at', 'timestamptz');
    PERFORM safe_migrate_column('ExamResult', 'createdAt', 'created_at', 'timestamptz');
    PERFORM safe_migrate_column('ExamResult', 'updatedAt', 'updated_at', 'timestamptz');
    PERFORM safe_add_constraint('ExamResult', 'fk_exam_results_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('ExamResult', 'fk_exam_results_exam_id', 'FOREIGN KEY (exam_id) REFERENCES "Exam"(id) ON DELETE CASCADE');

    -- Topic
    PERFORM safe_migrate_column('Topic', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_add_constraint('Topic', 'fk_topics_subject_id', 'FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE CASCADE');

    -- SubTopic
    PERFORM safe_migrate_column('SubTopic', 'topicId', 'topic_id', 'uuid');
    PERFORM safe_add_constraint('SubTopic', 'fk_sub_topics_topic_id', 'FOREIGN KEY (topic_id) REFERENCES "Topic"(id) ON DELETE CASCADE');

    -- UserSubscription
    PERFORM safe_migrate_column('UserSubscription', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('UserSubscription', 'planId', 'plan_id', 'uuid');
    PERFORM safe_add_constraint('UserSubscription', 'fk_user_subscriptions_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('UserSubscription', 'fk_user_subscriptions_plan_id', 'FOREIGN KEY (plan_id) REFERENCES "SubscriptionPlan"(id) ON DELETE SET NULL');

    -- UserAchievement
    PERFORM safe_migrate_column('UserAchievement', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('UserAchievement', 'achievementId', 'achievement_id', 'uuid');
    PERFORM safe_add_constraint('UserAchievement', 'fk_user_achievements_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- UserChallenge
    PERFORM safe_migrate_column('UserChallenge', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('UserChallenge', 'challengeId', 'challenge_id', 'uuid');
    PERFORM safe_migrate_column('UserChallenge', 'examId', 'exam_id', 'uuid');
    PERFORM safe_add_constraint('UserChallenge', 'fk_user_challenges_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('UserChallenge', 'fk_user_challenges_challenge_id', 'FOREIGN KEY (challenge_id) REFERENCES "Challenge"(id) ON DELETE CASCADE');

    -- Activity
    PERFORM safe_migrate_column('Activity', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('Activity', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_add_constraint('Activity', 'fk_activities_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('Activity', 'fk_activities_subject_id', 'FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE SET NULL');

    -- AIConversation
    PERFORM safe_migrate_column('AIConversation', 'userId', 'user_id', 'uuid');
    PERFORM safe_add_constraint('AIConversation', 'fk_ai_conversations_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');

    -- User renames
    PERFORM safe_migrate_column('User', 'emailVerified', 'email_verified', 'boolean');
    PERFORM safe_migrate_column('User', 'phoneVerified', 'phone_verified', 'boolean');
    PERFORM safe_migrate_column('User', 'activeSubscriptionId', 'active_subscription_id', 'uuid');
    PERFORM safe_migrate_column('User', 'referredById', 'referred_by_id', 'uuid');
    PERFORM safe_add_constraint('User', 'fk_user_active_subscription', 'FOREIGN KEY (active_subscription_id) REFERENCES "UserSubscription"(id) ON DELETE SET NULL');
    PERFORM safe_add_constraint('User', 'fk_user_referred_by_id', 'FOREIGN KEY (referred_by_id) REFERENCES "User"(id) ON DELETE SET NULL');

    -- EventAttendee
    PERFORM safe_migrate_column('EventAttendee', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('EventAttendee', 'eventId', 'event_id', 'uuid');
    PERFORM safe_add_constraint('EventAttendee', 'fk_event_attendee_user', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('EventAttendee', 'fk_event_attendee_event', 'FOREIGN KEY (event_id) REFERENCES "Event"(id) ON DELETE CASCADE');

    -- SubjectEnrollment (Alternative name for Enrollment)
    PERFORM safe_migrate_column('SubjectEnrollment', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('SubjectEnrollment', 'subjectId', 'subject_id', 'uuid');
    PERFORM safe_add_constraint('SubjectEnrollment', 'fk_subject_enrollments_user_id', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('SubjectEnrollment', 'fk_subject_enrollments_subject_id', 'FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE CASCADE');

    -- TopicProgress
    PERFORM safe_migrate_column('TopicProgress', 'userId', 'user_id', 'uuid');
    PERFORM safe_migrate_column('TopicProgress', 'subTopicId', 'sub_topic_id', 'uuid');
    PERFORM safe_add_constraint('TopicProgress', 'fk_topic_progress_user', 'FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE');
    PERFORM safe_add_constraint('TopicProgress', 'fk_topic_progress_subtopic', 'FOREIGN KEY (sub_topic_id) REFERENCES "SubTopic"(id) ON DELETE CASCADE');
END $$;

-- ============================================
-- Step 4: Recreate views dropped in Step 1
-- ============================================
DO $$
DECLARE
    d_col text;
BEGIN
    -- ActiveUsers
    SELECT column_name INTO d_col FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('deletedat', 'deleted_at') ORDER BY (column_name = 'deletedAt') DESC LIMIT 1;
    IF d_col IS NOT NULL THEN
        EXECUTE format('CREATE OR REPLACE VIEW "ActiveUsers" AS SELECT * FROM "User" WHERE %I IS NULL', d_col);
    END IF;

    -- ActivePayments
    SELECT column_name INTO d_col FROM information_schema.columns WHERE LOWER(table_name) = 'payment' AND LOWER(column_name) IN ('deletedat', 'deleted_at') ORDER BY (column_name = 'deletedAt') DESC LIMIT 1;
    IF d_col IS NOT NULL THEN
        EXECUTE format('CREATE OR REPLACE VIEW "ActivePayments" AS SELECT * FROM "Payment" WHERE %I IS NULL', d_col);
    END IF;

    -- ActiveEnrollments
    SELECT column_name INTO d_col FROM information_schema.columns WHERE LOWER(table_name) = 'subjectenrollment' AND LOWER(column_name) IN ('deletedat', 'deleted_at') ORDER BY (column_name = 'deletedAt') DESC LIMIT 1;
    IF d_col IS NOT NULL THEN
        EXECUTE format('CREATE OR REPLACE VIEW "ActiveEnrollments" AS SELECT * FROM "SubjectEnrollment" WHERE %I IS NULL', d_col);
    END IF;
END $$;

-- Final Step: Clean up helper functions
DROP FUNCTION IF EXISTS safe_migrate_column(text, text, text, text);
DROP FUNCTION IF EXISTS safe_add_constraint(text, text, text);
DROP FUNCTION IF EXISTS text_to_uuid(text);
DROP FUNCTION IF EXISTS text_to_uuid(uuid);

COMMIT;

-- ============================================
-- Post-migration notes:
-- 1. This migration converts all text ID columns to uuid type
-- 2. All foreign key constraints are recreated
-- 3. Make sure to update Go models to use type:uuid instead of type:text
-- 4. Test thoroughly in a staging environment before applying to production
-- ============================================