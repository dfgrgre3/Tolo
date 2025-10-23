-- Create partitioned tables for large datasets

-- Convert StudySession table to partitioned table
-- First, create the parent table with partitioning
CREATE TABLE IF NOT EXISTS "StudySession_partitioned" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "focusScore" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "strategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE ("createdAt");

-- Create default partition for backwards compatibility
CREATE TABLE IF NOT EXISTS "StudySession_default" PARTITION OF "StudySession_partitioned" DEFAULT;

-- Function to create monthly partitions for StudySession
CREATE OR REPLACE FUNCTION create_studysession_partition(partition_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'StudySession_' || EXTRACT(YEAR FROM partition_date) || '_' || LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = partition_name
        AND c.relkind = 'r'
        AND n.nspname = 'public'
    ) THEN
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF StudySession_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for the current year and next year
SELECT create_studysession_partition(d::DATE)
FROM generate_series(CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '12 months', '1 month') AS d;

-- Function to automatically create future partitions
CREATE OR REPLACE FUNCTION create_studysession_partition_if_needed()
RETURNS TRIGGER AS $$
BEGIN
    -- Create partition for the next month when inserting data near the end of current month
    IF NEW."createdAt" >= DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') THEN
        PERFORM create_studysession_partition(DATE_TRUNC('month', NEW."createdAt"));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic partition creation
DROP TRIGGER IF EXISTS create_studysession_partition_trigger ON "StudySession";
CREATE TRIGGER create_studysession_partition_trigger
    BEFORE INSERT ON "StudySession"
    FOR EACH ROW
    EXECUTE FUNCTION create_studysession_partition_if_needed();

-- Convert ProgressSnapshot table to partitioned table
CREATE TABLE IF NOT EXISTS "ProgressSnapshot_partitioned" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalStudyMinutes" INTEGER NOT NULL DEFAULT 0,
    "averageFocusScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "gradeAverage" DOUBLE PRECISION,
    "improvementRate" DOUBLE PRECISION
) PARTITION BY RANGE ("date");

CREATE TABLE IF NOT EXISTS "ProgressSnapshot_default" PARTITION OF "ProgressSnapshot_partitioned" DEFAULT;

-- Function to create monthly partitions for ProgressSnapshot
CREATE OR REPLACE FUNCTION create_progresssnapshot_partition(partition_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'ProgressSnapshot_' || EXTRACT(YEAR FROM partition_date) || '_' || LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = partition_name
        AND c.relkind = 'r'
        AND n.nspname = 'public'
    ) THEN
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF ProgressSnapshot_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_progresssnapshot_partition(d::DATE)
FROM generate_series(CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '12 months', '1 month') AS d;

-- Convert SecurityLog table to partitioned table
CREATE TABLE IF NOT EXISTS "SecurityLog_partitioned" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "location" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE ("createdAt");

CREATE TABLE IF NOT EXISTS "SecurityLog_default" PARTITION OF "SecurityLog_partitioned" DEFAULT;

-- Function to create monthly partitions for SecurityLog
CREATE OR REPLACE FUNCTION create_securitylog_partition(partition_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'SecurityLog_' || EXTRACT(YEAR FROM partition_date) || '_' || LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = partition_name
        AND c.relkind = 'r'
        AND n.nspname = 'public'
    ) THEN
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF SecurityLog_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_securitylog_partition(d::DATE)
FROM generate_series(CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', '1 month') AS d;

-- Convert Session table to partitioned table
CREATE TABLE IF NOT EXISTS "Session_partitioned" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "deviceInfo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true
) PARTITION BY RANGE ("createdAt");

CREATE TABLE IF NOT EXISTS "Session_default" PARTITION OF "Session_partitioned" DEFAULT;

-- Function to create monthly partitions for Session
CREATE OR REPLACE FUNCTION create_session_partition(partition_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'Session_' || EXTRACT(YEAR FROM partition_date) || '_' || LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = partition_name
        AND c.relkind = 'r'
        AND n.nspname = 'public'
    ) THEN
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF Session_partitioned FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT create_session_partition(d::DATE)
FROM generate_series(CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '3 months', '1 month') AS d;

-- Create maintenance function for partition cleanup and creation
CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS VOID AS $$
BEGIN
    -- Create new partitions for next month
    PERFORM create_studysession_partition(DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));
    PERFORM create_progresssnapshot_partition(DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));
    PERFORM create_securitylog_partition(DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));
    PERFORM create_session_partition(DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));

    -- Remove old partitions (older than 2 years for study sessions, 1 year for others)
    -- This is a placeholder - actual cleanup would need to be scheduled separately
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO CURRENT_USER;
