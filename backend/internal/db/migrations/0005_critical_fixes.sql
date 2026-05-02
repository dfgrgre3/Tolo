-- Migration: 0005_critical_fixes.sql
-- Purpose: Fix AI table names, add missing foreign keys, CHECK constraints, Soft Deletes, and indexes.
-- Date: 2026-05-02

-- ============================================================
-- 1. Rename AI tables to PascalCase (match PrismaNamingStrategy)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_messages') THEN
        ALTER TABLE "ai_messages" RENAME TO "AIMessage";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_conversations') THEN
        ALTER TABLE "ai_conversations" RENAME TO "AIConversation";
    END IF;
END $$;

-- ============================================================
-- 2. Add Soft Delete (deletedAt) to missing models
-- ============================================================
DO $$
BEGIN
    -- Activities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Task" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_task_deleted_at ON "Task" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StudySession' AND column_name = 'deletedAt') THEN
        ALTER TABLE "StudySession" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_studysession_deleted_at ON "StudySession" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Schedule' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Schedule" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_schedule_deleted_at ON "Schedule" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reminder' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Reminder" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_reminder_deleted_at ON "Reminder" ("deletedAt");
    END IF;

    -- Gamification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Achievement' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Achievement" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_achievement_deleted_at ON "Achievement" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Reward" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_reward_deleted_at ON "Reward" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Season' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Season" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_season_deleted_at ON "Season" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Challenge' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Challenge" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_challenge_deleted_at ON "Challenge" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserAchievement' AND column_name = 'deletedAt') THEN
        ALTER TABLE "UserAchievement" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_userachievement_deleted_at ON "UserAchievement" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserChallenge' AND column_name = 'deletedAt') THEN
        ALTER TABLE "UserChallenge" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_userchallenge_deleted_at ON "UserChallenge" ("deletedAt");
    END IF;

    -- Marketing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Coupon' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Coupon" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_coupon_deleted_at ON "Coupon" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Automation' AND column_name = 'deletedAt') THEN
        ALTER TABLE "Automation" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_automation_deleted_at ON "Automation" ("deletedAt");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ABExperiment' AND column_name = 'deletedAt') THEN
        ALTER TABLE "ABExperiment" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_abexperiment_deleted_at ON "ABExperiment" ("deletedAt");
    END IF;

    -- AI Message (Conversation already has isActive, but adding deletedAt for consistency if using gorm.DeletedAt)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AIMessage' AND column_name = 'deletedAt') THEN
        ALTER TABLE "AIMessage" ADD COLUMN "deletedAt" timestamptz;
        CREATE INDEX idx_aimessage_deleted_at ON "AIMessage" ("deletedAt");
    END IF;
END $$;

-- ============================================================
-- 3. Add Missing Foreign Keys
-- ============================================================
DO $$
BEGIN
    -- Activity FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_user') THEN
        ALTER TABLE "Task" ADD CONSTRAINT fk_task_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_studysession_user') THEN
        ALTER TABLE "StudySession" ADD CONSTRAINT fk_studysession_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_schedule_user') THEN
        ALTER TABLE "Schedule" ADD CONSTRAINT fk_schedule_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reminder_user') THEN
        ALTER TABLE "Reminder" ADD CONSTRAINT fk_reminder_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
    END IF;

    -- AuditLog FK
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auditlog_user') THEN
        ALTER TABLE "AuditLog" ADD CONSTRAINT fk_auditlog_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;
    END IF;

    -- Content FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_blogpost_category') THEN
        ALTER TABLE "BlogPost" ADD CONSTRAINT fk_blogpost_category FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_forumtopic_category') THEN
        ALTER TABLE "ForumTopic" ADD CONSTRAINT fk_forumtopic_category FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE SET NULL;
    END IF;

    -- Gamification FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userachievement_user') THEN
        ALTER TABLE "UserAchievement" ADD CONSTRAINT fk_userachievement_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userachievement_achievement') THEN
        ALTER TABLE "UserAchievement" ADD CONSTRAINT fk_userachievement_achievement FOREIGN KEY ("achievementId") REFERENCES "Achievement"(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userchallenge_user') THEN
        ALTER TABLE "UserChallenge" ADD CONSTRAINT fk_userchallenge_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userchallenge_challenge') THEN
        ALTER TABLE "UserChallenge" ADD CONSTRAINT fk_userchallenge_challenge FOREIGN KEY ("challengeId") REFERENCES "Challenge"(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 4. Add Missing CHECK Constraints
-- ============================================================
DO $$
BEGIN
    -- User balances
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_balance_nonneg') THEN
        ALTER TABLE "User" ADD CONSTRAINT chk_user_balance_nonneg CHECK (balance >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_ai_credits_nonneg') THEN
        ALTER TABLE "User" ADD CONSTRAINT chk_user_ai_credits_nonneg CHECK ("aiCredits" >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_exam_credits_nonneg') THEN
        ALTER TABLE "User" ADD CONSTRAINT chk_user_exam_credits_nonneg CHECK ("examCredits" >= 0);
    END IF;

    -- Subject
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subject_rating') THEN
        ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_rating CHECK (rating >= 0 AND rating <= 5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subject_enrolled_nonneg') THEN
        ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_enrolled_nonneg CHECK ("enrolledCount" >= 0);
    END IF;

    -- CourseReview
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_review_rating') THEN
        ALTER TABLE "CourseReview" ADD CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5);
    END IF;

    -- UserSubscription
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sub_dates') THEN
        ALTER TABLE "UserSubscription" ADD CONSTRAINT chk_sub_dates CHECK ("endDate" > "startDate");
    END IF;

    -- LessonProgress (TopicProgress)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_progress_time_nonneg') THEN
        ALTER TABLE "TopicProgress" ADD CONSTRAINT chk_progress_time_nonneg CHECK ("timeSpentSeconds" >= 0);
    END IF;
END $$;

-- ============================================================
-- 5. Add Performance Indexes
-- ============================================================

-- Task
CREATE INDEX IF NOT EXISTS idx_task_user_due ON "Task" ("userId", "dueAt");
CREATE INDEX IF NOT EXISTS idx_task_subject ON "Task" ("subjectId") WHERE "subjectId" IS NOT NULL;

-- Enrollment
CREATE INDEX IF NOT EXISTS idx_enrollment_subject ON "SubjectEnrollment" ("subjectId", "createdAt" DESC);

-- LessonProgress
CREATE INDEX IF NOT EXISTS idx_progress_user_status ON "TopicProgress" ("userId", status);

-- Invoice
CREATE INDEX IF NOT EXISTS idx_invoice_user ON "Invoice" ("userId", "createdAt" DESC);

-- BlogPost
CREATE INDEX IF NOT EXISTS idx_blog_status_published ON "BlogPost" (status, "publishedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON "BlogPost" (slug);

-- Book
CREATE INDEX IF NOT EXISTS idx_book_subject ON "Book" ("subjectId") WHERE "subjectId" IS NOT NULL;

-- AuditLog
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON "AuditLog" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_created ON "AuditLog" ("eventType", "createdAt" DESC);
