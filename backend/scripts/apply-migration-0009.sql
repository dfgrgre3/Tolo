-- Quick Fix: Apply Critical Schema Fixes
-- Run this in your PostgreSQL client if migrations fail
-- Date: 2026-05-04

-- ===========================================
-- 1. Add missing deleted_at to User table
-- ===========================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "User" ("deleted_at");

-- ===========================================
-- 2. Fix SecurityLog user_id column
-- ===========================================
-- Rename userId to user_id if exists (case sensitivity issue)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SecurityLog' AND column_name = 'userId') THEN
        ALTER TABLE "SecurityLog" RENAME COLUMN "userId" TO "user_id";
    END IF;
END
$$;

-- Add user_id if still missing
ALTER TABLE "SecurityLog" ADD COLUMN IF NOT EXISTS "user_id" UUID;

-- ===========================================
-- 3. Create SystemSetting table
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

-- Insert default admin settings
INSERT INTO "SystemSetting" ("key", "value")
SELECT 'admin_settings', '{"siteName":"Thanawy","siteDescription":"منصة تعليمية لإدارة التعلم والمحتوى.","features":{"registration":true,"emailVerification":true,"engagement":true,"forum":true,"blog":true,"events":true,"aiAssistant":true}}'
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "key" = 'admin_settings');

-- ===========================================
-- 4. Create AuditLog table
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
-- 5. Create schema_migrations tracking table
-- ===========================================
CREATE TABLE IF NOT EXISTS "schema_migrations" (
    id text PRIMARY KEY,
    checksum text NOT NULL,
    "appliedAt" timestamptz NOT NULL DEFAULT now()
);

-- Mark migration 0009 as applied
INSERT INTO "schema_migrations" (id, checksum, "appliedAt")
VALUES ('0009_fix_missing_columns_and_tables', 'quick_fix_manual', now())
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 6. Verify schema
-- ===========================================
DO $$
DECLARE
    tables_ok BOOLEAN := true;
    columns_ok BOOLEAN := true;
BEGIN
    -- Check tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SystemSetting') THEN
        RAISE NOTICE 'ERROR: SystemSetting table not created';
        tables_ok := false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AuditLog') THEN
        RAISE NOTICE 'ERROR: AuditLog table not created';
        tables_ok := false;
    END IF;
    
    -- Check columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'deleted_at') THEN
        RAISE NOTICE 'ERROR: User.deleted_at column not created';
        columns_ok := false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SecurityLog' AND column_name = 'user_id') THEN
        RAISE NOTICE 'ERROR: SecurityLog.user_id column not created';
        columns_ok := false;
    END IF;
    
    IF tables_ok AND columns_ok THEN
        RAISE NOTICE 'SUCCESS: All schema fixes applied successfully!';
    ELSE
        RAISE NOTICE 'WARNING: Some schema fixes failed. Check errors above.';
    END IF;
END
$$;
