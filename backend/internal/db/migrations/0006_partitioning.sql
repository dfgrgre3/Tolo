-- Migration: 0006_partitioning.sql
-- Purpose: Add table partitioning for high-volume tables (ExamResult, AIMessage, AuditLog)
-- Date: 2026-05-03

-- ============================================================
-- 1. Partitioning for ExamResult table
-- ============================================================

-- Create new partitioned table for ExamResult
CREATE TABLE "ExamResult_New" (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    exam_id uuid NOT NULL,
    score double precision DEFAULT 0,
    max_score double precision DEFAULT 0,
    passed boolean DEFAULT false,
    answers text,
    taken_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamResult_New_pkey" PRIMARY KEY (id, taken_at)
) PARTITION BY RANGE (taken_at);

-- Create monthly partitions
DO $$
DECLARE
    start_date date := date_trunc('month', CURRENT_DATE - interval '3 months');
    end_date date := date_trunc('month', CURRENT_DATE + interval '4 months');
    partition_name text;
    start_str text;
    end_str text;
BEGIN
    WHILE start_date < end_date LOOP
        partition_name := 'examresult_' || to_char(start_date, 'YYYY_MM');
        start_str := to_char(start_date, 'YYYY-MM-DD');
        end_str := to_char(start_date + interval '1 month', 'YYYY-MM-DD');
        
        EXECUTE format('CREATE TABLE %I PARTITION OF "ExamResult_New" FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_str, end_str);
        
        start_date := start_date + interval '1 month';
    END LOOP;
END $$;

-- Create default partition
CREATE TABLE "examresult_default" PARTITION OF "ExamResult_New" DEFAULT;

-- Migrate data (attempting to cast to UUID if they were text)
INSERT INTO "ExamResult_New" (id, user_id, exam_id, score, max_score, passed, answers, taken_at, created_at, updated_at)
SELECT id::uuid, "userId"::uuid, "examId"::uuid, score, "maxScore", passed, answers, "takenAt", "createdAt", "updatedAt"
FROM "ExamResult";

-- Drop old table and rename new one
DROP TABLE "ExamResult" CASCADE;
ALTER TABLE "ExamResult_New" RENAME TO "ExamResult";

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_examresult_user_taken ON "ExamResult" (user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_examresult_exam ON "ExamResult" (exam_id);
CREATE INDEX IF NOT EXISTS idx_examresult_passed ON "ExamResult" (passed) WHERE passed = true;

-- ============================================================
-- 2. Partitioning for AIMessage table
-- ============================================================

-- Create new partitioned table for AIMessage
CREATE TABLE "AIMessage_New" (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_New_pkey" PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
DO $$
DECLARE
    start_date date := date_trunc('month', CURRENT_DATE - interval '3 months');
    end_date date := date_trunc('month', CURRENT_DATE + interval '4 months');
    partition_name text;
    start_str text;
    end_str text;
BEGIN
    WHILE start_date < end_date LOOP
        partition_name := 'aimessage_' || to_char(start_date, 'YYYY_MM');
        start_str := to_char(start_date, 'YYYY-MM-DD');
        end_str := to_char(start_date + interval '1 month', 'YYYY-MM-DD');
        
        EXECUTE format('CREATE TABLE %I PARTITION OF "AIMessage_New" FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_str, end_str);
        
        start_date := start_date + interval '1 month';
    END LOOP;
END $$;

-- Create default partition
CREATE TABLE "aimessage_default" PARTITION OF "AIMessage_New" DEFAULT;

-- Migrate data
INSERT INTO "AIMessage_New" (id, conversation_id, role, content, created_at, updated_at)
SELECT id::uuid, "conversationId"::uuid, role, content, "createdAt", "updatedAt"
FROM "AIMessage";

-- Drop old table and rename new one
DROP TABLE "AIMessage" CASCADE;
ALTER TABLE "AIMessage_New" RENAME TO "AIMessage";

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_aimessage_conversation ON "AIMessage" (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aimessage_role ON "AIMessage" (role);

-- ============================================================
-- 3. Partitioning for AuditLog table
-- ============================================================

-- Create new partitioned table for AuditLog
CREATE TABLE "AuditLog_New" (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    event_type text NOT NULL,
    description text,
    metadata text,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_New_pkey" PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
DO $$
DECLARE
    start_date date := date_trunc('month', CURRENT_DATE - interval '3 months');
    end_date date := date_trunc('month', CURRENT_DATE + interval '4 months');
    partition_name text;
    start_str text;
    end_str text;
BEGIN
    WHILE start_date < end_date LOOP
        partition_name := 'auditlog_' || to_char(start_date, 'YYYY_MM');
        start_str := to_char(start_date, 'YYYY-MM-DD');
        end_str := to_char(start_date + interval '1 month', 'YYYY-MM-DD');
        
        EXECUTE format('CREATE TABLE %I PARTITION OF "AuditLog_New" FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_str, end_str);
        
        start_date := start_date + interval '1 month';
    END LOOP;
END $$;

-- Create default partition
CREATE TABLE "auditlog_default" PARTITION OF "AuditLog_New" DEFAULT;

-- Migrate data
INSERT INTO "AuditLog_New" (id, user_id, event_type, description, metadata, ip_address, user_agent, created_at)
SELECT id::uuid, "userId"::uuid, "eventType", description, metadata, "ipAddress", "userAgent", "createdAt"
FROM "AuditLog";

-- Drop old table and rename
DROP TABLE "AuditLog" CASCADE;
ALTER TABLE "AuditLog_New" RENAME TO "AuditLog";

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_auditlog_user_created ON "AuditLog" (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditlog_event_created ON "AuditLog" (event_type, created_at DESC);

-- ============================================================
-- 4. Function to automatically create future partitions
-- ============================================================

CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
    table_name text;
    partition_name text;
    start_date date;
    end_date date;
    start_str text;
    end_str text;
BEGIN
    -- For ExamResult
    table_name := 'ExamResult';
    start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    end_date := start_date + interval '1 month';
    partition_name := 'examresult_' || to_char(start_date, 'YYYY_MM');
    start_str := to_char(start_date, 'YYYY-MM-DD');
    end_str := to_char(end_date, 'YYYY-MM-DD');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_str, end_str);
    
    -- For AIMessage
    table_name := 'AIMessage';
    partition_name := 'aimessage_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_str, end_str);
    
    -- For AuditLog
    table_name := 'AuditLog';
    partition_name := 'auditlog_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_str, end_str);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Create a scheduled job to create future partitions (requires pg_cron extension)
-- ============================================================

-- Note: Uncomment the following if pg_cron is available
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('create-monthly-partitions', '0 0 1 * *', 'SELECT create_monthly_partitions()');

-- ============================================================
-- 6. Update the RunSQLMigrations function to execute this migration
-- ============================================================

COMMENT ON TABLE "ExamResult" IS 'Partitioned by takenAt (monthly). Use create_monthly_partitions() to create future partitions.';
COMMENT ON TABLE "AIMessage" IS 'Partitioned by createdAt (monthly). Use create_monthly_partitions() to create future partitions.';
COMMENT ON TABLE "AuditLog" IS 'Partitioned by createdAt (monthly). Use create_monthly_partitions() to create future partitions.';