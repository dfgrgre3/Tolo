-- Migration: Fix Missing Columns and Tables
-- Date: 2026-05-04
-- Description: Adds missing deleted_at columns, user_id columns, and creates missing tables.
-- This migration is idempotent and safe to run multiple times.

BEGIN;

-- ===========================================
-- 1. Add missing deleted_at columns
-- ===========================================

-- User table: Add deleted_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'deleted_at') THEN
        ALTER TABLE "User" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "User" ("deleted_at");
    END IF;
END
$$;

-- StudySession table: Add deleted_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'StudySession' AND column_name = 'deleted_at') THEN
        ALTER TABLE "StudySession" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_study_session_deleted_at ON "StudySession" ("deleted_at");
    END IF;
END
$$;

-- Task table: Add deleted_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Task" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_task_deleted_at ON "Task" ("deleted_at");
    END IF;
END
$$;

-- Exam table: Add deleted_at if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Exam' AND column_name = 'deleted_at') THEN
        ALTER TABLE "Exam" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_exam_deleted_at ON "Exam" ("deleted_at");
    END IF;
END
$$;

-- ===========================================
-- 2. Fix UserSettings table
-- ===========================================

-- Check if user_id column exists (it might be named userId)
DO $$
BEGIN
    -- Check if userId column exists and rename it to user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserSettings' AND column_name = 'userId') THEN
        ALTER TABLE "UserSettings" RENAME COLUMN "userId" TO "user_id";
    END IF;
    
    -- If user_id doesn't exist at all, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserSettings' AND column_name = 'user_id') THEN
        ALTER TABLE "UserSettings" ADD COLUMN "user_id" UUID;
    END IF;
    
    -- Add deleted_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserSettings' AND column_name = 'deleted_at') THEN
        ALTER TABLE "UserSettings" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_user_settings_deleted_at ON "UserSettings" ("deleted_at");
    END IF;
END
$$;

-- ===========================================
-- 3. Fix SecurityLog table
-- ===========================================

-- Check if user_id column exists (it might be named userId)
DO $$
BEGIN
    -- Check if userId column exists and rename it to user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SecurityLog' AND column_name = 'userId') THEN
        ALTER TABLE "SecurityLog" RENAME COLUMN "userId" TO "user_id";
    END IF;
    
    -- If user_id doesn't exist at all, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SecurityLog' AND column_name = 'user_id') THEN
        ALTER TABLE "SecurityLog" ADD COLUMN "user_id" UUID;
    END IF;
END
$$;

-- ===========================================
-- 4. Create AuditLog table if not exists
-- ===========================================

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50),
    "resource" VARCHAR(100),
    "resource_id" VARCHAR(100),
    "changes" TEXT,
    "metadata" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_info" VARCHAR(255),
    "location" VARCHAR(255),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON "AuditLog" ("user_id");
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON "AuditLog" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON "AuditLog" ("event_type");

-- ===========================================
-- 5. Create SystemSetting table if not exists
-- ===========================================

CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) UNIQUE NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_setting_key ON "SystemSetting" ("key");
CREATE INDEX IF NOT EXISTS idx_system_setting_deleted_at ON "SystemSetting" ("deleted_at");

-- ===========================================
-- 6. Create ip_whitelist_settings table if not exists
-- ===========================================

CREATE TABLE IF NOT EXISTS "ip_whitelist_settings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "is_enabled" BOOLEAN DEFAULT FALSE,
    "enforce_for_admins" BOOLEAN DEFAULT TRUE,
    "enforce_for_api" BOOLEAN DEFAULT FALSE,
    "default_action" VARCHAR(10) DEFAULT 'allow',
    "allow_internal_ips" BOOLEAN DEFAULT TRUE,
    "internal_ip_ranges" TEXT[],
    "log_blocked_attempts" BOOLEAN DEFAULT TRUE,
    "notify_on_violation" BOOLEAN DEFAULT TRUE,
    "notify_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if table is empty
INSERT INTO "ip_whitelist_settings" ("is_enabled", "enforce_for_admins", "enforce_for_api", "default_action", "allow_internal_ips")
SELECT FALSE, TRUE, FALSE, 'allow', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "ip_whitelist_settings" LIMIT 1);

-- ===========================================
-- 7. Create ip_whitelist_entries table if not exists
-- ===========================================

CREATE TABLE IF NOT EXISTS "ip_whitelist_entries" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ip_address" VARCHAR(50) NOT NULL,
    "cidr" VARCHAR(50),
    "description" VARCHAR(500),
    "type" VARCHAR(20) NOT NULL DEFAULT 'admin',
    "status" VARCHAR(20) DEFAULT 'active',
    "is_temporary" BOOLEAN DEFAULT FALSE,
    "expires_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "created_by" UUID REFERENCES "User"("id"),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ip_whitelist_entries_ip ON "ip_whitelist_entries" ("ip_address");
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_entries_status ON "ip_whitelist_entries" ("status");
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_entries_deleted_at ON "ip_whitelist_entries" ("deleted_at");

-- ===========================================
-- 8. Create blocked_ip_attempts table if not exists
-- ===========================================

CREATE TABLE IF NOT EXISTS "blocked_ip_attempts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ip_address" VARCHAR(50) NOT NULL,
    "endpoint" VARCHAR(500),
    "method" VARCHAR(10),
    "user_agent" TEXT,
    "location" VARCHAR(200),
    "reason" VARCHAR(200),
    "user_id" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "count" INT DEFAULT 1,
    "attempted_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocked_ip_attempts_ip ON "blocked_ip_attempts" ("ip_address");
CREATE INDEX IF NOT EXISTS idx_blocked_ip_attempts_attempted_at ON "blocked_ip_attempts" ("attempted_at" DESC);

-- ===========================================
-- 9. Create security_audit_logs table if not exists
-- ===========================================

CREATE TABLE IF NOT EXISTS "security_audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(50) NOT NULL,
    "user_id" UUID REFERENCES "User"("id") ON DELETE SET NULL,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "details" JSONB,
    "severity" VARCHAR(20) DEFAULT 'info',
    "status" VARCHAR(20) DEFAULT 'unread',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON "security_audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON "security_audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON "security_audit_logs" ("event_type");

COMMIT;