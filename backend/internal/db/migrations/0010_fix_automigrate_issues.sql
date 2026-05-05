-- Migration: Fix AutoMigrate Issues (password_hash, deleted_at columns)
-- Date: 2026-05-05
-- Description: Safely adds columns that AutoMigrate fails on when table has existing data.
-- This migration is idempotent and safe to run multiple times.

BEGIN;

-- ===========================================
-- 1. Fix User table: Add password_hash safely
-- ===========================================
DO $$
BEGIN
    -- Check if password column exists (old schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'password') THEN
        -- Add password_hash as nullable first
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'password_hash') THEN
            ALTER TABLE "User" ADD COLUMN "password_hash" TEXT;
        END IF;
        
        -- Migrate data from old password column
        UPDATE "User" SET "password_hash" = "password" WHERE "password_hash" IS NULL AND "password" IS NOT NULL;
        
        -- Set default for any remaining NULLs
        UPDATE "User" SET "password_hash" = 'legacy_migration_hash' WHERE "password_hash" IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE "User" ALTER COLUMN "password_hash" SET NOT NULL;
        
        -- Drop old password column (optional - uncomment if you want to remove it)
        -- ALTER TABLE "User" DROP COLUMN "password";
    ELSE
        -- No old password column, just add password_hash if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'password_hash') THEN
            ALTER TABLE "User" ADD COLUMN "password_hash" TEXT NOT NULL DEFAULT 'legacy_migration_hash';
        END IF;
    END IF;
END
$$;

-- ===========================================
-- 2. Fix Category table: Add deleted_at for soft delete
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Category' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Category" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_category_deleted_at ON "Category" ("deleted_at");
    END IF;
END
$$;

-- ===========================================
-- 3. Fix SystemSetting table: Ensure it exists
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SystemSetting') THEN
        CREATE TABLE "SystemSetting" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "key" VARCHAR(100) UNIQUE NOT NULL,
            "value" TEXT,
            "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "deleted_at" TIMESTAMPTZ
        );
        
        CREATE INDEX idx_system_setting_key ON "SystemSetting" ("key");
        CREATE INDEX idx_system_setting_deleted_at ON "SystemSetting" ("deleted_at");
    END IF;
END
$$;

-- ===========================================
-- 4. Fix other tables missing deleted_at
-- ===========================================

-- Subject table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Subject' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Subject" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_subject_deleted_at ON "Subject" ("deleted_at");
    END IF;
END
$$;

-- Topic table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Topic' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Topic" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_topic_deleted_at ON "Topic" ("deleted_at");
    END IF;
END
$$;

-- SubTopic table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SubTopic' AND column_name = 'deleted_at') THEN
        ALTER TABLE "SubTopic" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_subtopic_deleted_at ON "SubTopic" ("deleted_at");
    END IF;
END
$$;

-- Exam table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Exam' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Exam" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_exam_deleted_at ON "Exam" ("deleted_at");
    END IF;
END
$$;

-- Question table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Question' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Question" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_question_deleted_at ON "Question" ("deleted_at");
    END IF;
END
$$;

-- Payment table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Payment" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_payment_deleted_at ON "Payment" ("deleted_at");
    END IF;
END
$$;

-- Invoice table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Invoice' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Invoice" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_invoice_deleted_at ON "Invoice" ("deleted_at");
    END IF;
END
$$;

-- Notification table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Notification" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_notification_deleted_at ON "Notification" ("deleted_at");
    END IF;
END
$$;

-- SecurityLog table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SecurityLog' AND column_name = 'deleted_at') THEN
        ALTER TABLE "SecurityLog" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_security_log_deleted_at ON "SecurityLog" ("deleted_at");
    END IF;
END
$$;

-- ===========================================
-- 5. Create missing Session table if needed
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Session') THEN
        CREATE TABLE "Session" (
            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "userId" UUID REFERENCES "User"("id") ON DELETE CASCADE,
            "token" TEXT NOT NULL,
            "isActive" BOOLEAN DEFAULT TRUE,
            "expiresAt" TIMESTAMPTZ NOT NULL,
            "lastAccessed" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "ipAddress" VARCHAR(45),
            "userAgent" TEXT,
            "deviceInfo" VARCHAR(255),
            "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            "deleted_at" TIMESTAMPTZ
        );
        
        CREATE INDEX idx_session_userId ON "Session" ("userId");
        CREATE INDEX idx_session_token ON "Session" ("token");
        CREATE INDEX idx_session_deleted_at ON "Session" ("deleted_at");
    END IF;
END
$$;

COMMIT;
