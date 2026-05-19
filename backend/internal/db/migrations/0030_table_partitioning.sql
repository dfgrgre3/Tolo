-- Migration 0030: Table Partitioning for Time-Series Data
-- Implements PostgreSQL declarative partitioning for high-volume tables
-- Reduces query latency by partitioning data by month

BEGIN;

-- ============================================================
-- Analytics Events Partitioning (Monthly)
-- ============================================================

-- Create partitioned parent table
CREATE TABLE "AnalyticsEvent_partitioned" (
    "id" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "eventType" text NOT NULL,
    "eventData" jsonb,
    "timestamp" timestamptz NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE ("timestamp");

-- Create partitions for the next 12 months
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := DATE_TRUNC('month', CURRENT_DATE + ((i + 1) || ' months')::INTERVAL);
        partition_name := 'analytics_event_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "AnalyticsEvent_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
    END LOOP;
END $$;

-- Create indexes on partitions
CREATE INDEX IF NOT EXISTS idx_analytics_event_user_type ON "AnalyticsEvent_partitioned" ("userId", "eventType");
CREATE INDEX IF NOT EXISTS idx_analytics_event_timestamp ON "AnalyticsEvent_partitioned" ("timestamp" DESC);

-- ============================================================
-- Security Audit Logs Partitioning (Monthly)
-- ============================================================

CREATE TABLE "security_audit_logs_partitioned" (
    "id" uuid NOT NULL,
    "user_id" uuid,
    "event_type" text NOT NULL,
    "severity" text NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "details" jsonb,
    "status" text NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE ("createdAt");

DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := DATE_TRUNC('month', CURRENT_DATE + ((i + 1) || ' months')::INTERVAL);
        partition_name := 'security_audit_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "security_audit_logs_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_security_audit_user_event ON "security_audit_logs_partitioned" ("user_id", "event_type");
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON "security_audit_logs_partitioned" ("severity") WHERE "severity" IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON "security_audit_logs_partitioned" ("createdAt" DESC);

-- ============================================================
-- Audit Logs Partitioning (Monthly)
-- ============================================================

CREATE TABLE "AuditLog_partitioned" (
    "id" uuid NOT NULL,
    "userId" uuid,
    "action" text NOT NULL,
    "resource" text NOT NULL,
    "resource_id" text,
    "details" jsonb,
    "ip_address" text,
    "createdAt" timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE ("createdAt");

DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := DATE_TRUNC('month', CURRENT_DATE + ((i + 1) || ' months')::INTERVAL);
        partition_name := 'audit_log_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "AuditLog_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON "AuditLog_partitioned" ("userId", "action");
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON "AuditLog_partitioned" ("resource", "resource_id");
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON "AuditLog_partitioned" ("createdAt" DESC);

-- ============================================================
-- Study Sessions Partitioning (Monthly)
-- ============================================================

CREATE TABLE "StudySession_partitioned" (
    "id" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "subject_id" uuid,
    "start_time" timestamptz NOT NULL,
    "end_time" timestamptz,
    "duration_min" INTEGER,
    "createdAt" timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE ("start_time");

DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := DATE_TRUNC('month', CURRENT_DATE + ((i + 1) || ' months')::INTERVAL);
        partition_name := 'study_session_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "StudySession_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_session_user_time ON "StudySession_partitioned" ("userId", "start_time", "end_time");
CREATE INDEX IF NOT EXISTS idx_study_session_subject ON "StudySession_partitioned" ("subject_id") WHERE "subject_id" IS NOT NULL;

-- ============================================================
-- Partition Maintenance Functions
-- ============================================================

-- Function to create future partitions automatically
CREATE OR REPLACE FUNCTION create_future_partitions()
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    table_name TEXT;
    i INTEGER;
BEGIN
    -- Create partitions 3-6 months ahead
    FOR i IN 3..6 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := DATE_TRUNC('month', CURRENT_DATE + ((i + 1) || ' months')::INTERVAL);
        
        -- Analytics Events
        partition_name := 'analytics_event_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "AnalyticsEvent_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        -- Security Audit Logs
        partition_name := 'security_audit_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "security_audit_logs_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        -- Audit Logs
        partition_name := 'audit_log_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "AuditLog_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        
        -- Study Sessions
        partition_name := 'study_session_y' || EXTRACT(YEAR FROM start_date) || '_m' || LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS "%I" PARTITION OF "StudySession_partitioned" FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions (data older than 12 months)
CREATE OR REPLACE FUNCTION drop_old_partitions(retention_months INTEGER DEFAULT 12)
RETURNS void AS $$
DECLARE
    cutoff_date DATE;
    rec RECORD;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);
    
    -- Drop Analytics Event partitions older than retention period
    FOR rec IN 
        SELECT tablename FROM pg_tables 
        WHERE tablename LIKE 'analytics_event_y%' 
        AND tablename < 'analytics_event_y' || EXTRACT(YEAR FROM cutoff_date) || '_m' || LPAD(EXTRACT(MONTH FROM cutoff_date)::TEXT, 2, '0')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS "%I"', rec.tablename);
    END LOOP;
    
    -- Drop Security Audit partitions
    FOR rec IN 
        SELECT tablename FROM pg_tables 
        WHERE tablename LIKE 'security_audit_y%' 
        AND tablename < 'security_audit_y' || EXTRACT(YEAR FROM cutoff_date) || '_m' || LPAD(EXTRACT(MONTH FROM cutoff_date)::TEXT, 2, '0')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS "%I"', rec.tablename);
    END LOOP;
    
    -- Drop Audit Log partitions
    FOR rec IN 
        SELECT tablename FROM pg_tables 
        WHERE tablename LIKE 'audit_log_y%' 
        AND tablename < 'audit_log_y' || EXTRACT(YEAR FROM cutoff_date) || '_m' || LPAD(EXTRACT(MONTH FROM cutoff_date)::TEXT, 2, '0')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS "%I"', rec.tablename);
    END LOOP;
    
    -- Drop Study Session partitions
    FOR rec IN 
        SELECT tablename FROM pg_tables 
        WHERE tablename LIKE 'study_session_y%' 
        AND tablename < 'study_session_y' || EXTRACT(YEAR FROM cutoff_date) || '_m' || LPAD(EXTRACT(MONTH FROM cutoff_date)::TEXT, 2, '0')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS "%I"', rec.tablename);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Migration Complete
-- ============================================================

-- Note: To migrate existing data, run:
-- INSERT INTO "AnalyticsEvent_partitioned" SELECT * FROM "AnalyticsEvent";
-- Then rename tables and update application code to use partitioned tables.

COMMIT;
