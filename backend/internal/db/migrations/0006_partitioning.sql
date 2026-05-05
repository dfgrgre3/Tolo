-- Migration: 0006_partitioning.sql
-- Purpose: Add table partitioning for high-volume tables (ExamResult, AIMessage, AuditLog)
-- Date: 2026-05-03

-- ============================================================
-- 1. Partitioning for ExamResult table
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'examresult') AND NOT EXISTS (SELECT 1 FROM pg_partitioned_table pt JOIN pg_class c ON pt.partrelid = c.oid WHERE c.relname = 'ExamResult') THEN
        -- Create new partitioned table for ExamResult
        CREATE TABLE IF NOT EXISTS "ExamResult_New" (
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
        DECLARE
            start_date date := date_trunc('month', CURRENT_DATE - interval '3 months');
            end_date date := date_trunc('month', CURRENT_DATE + interval '4 months');
            partition_name text;
            start_str text;
            end_str text;
            u_col text; e_col text; s_col text; m_col text; p_col text; a_col text; t_col text; c_col text; up_col text;
        BEGIN
            WHILE start_date < end_date LOOP
                partition_name := 'examresult_p' || to_char(start_date, 'YYYY_MM');
                start_str := to_char(start_date, 'YYYY-MM-DD');
                end_str := to_char(start_date + interval '1 month', 'YYYY-MM-DD');
                EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF "ExamResult_New" FOR VALUES FROM (%L) TO (%L)', partition_name, start_str, end_str);
                start_date := start_date + interval '1 month';
            END LOOP;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'examresult_pdefault') THEN
                CREATE TABLE "examresult_pdefault" PARTITION OF "ExamResult_New" DEFAULT;
            END IF;

            -- Detect columns and migrate
            SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
            SELECT column_name INTO e_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) IN ('examid', 'exam_id') ORDER BY (column_name = 'examId') DESC LIMIT 1;
            SELECT column_name INTO s_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) = 'score' LIMIT 1;
            SELECT column_name INTO m_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) IN ('maxscore', 'max_score') ORDER BY (column_name = 'maxScore') DESC LIMIT 1;
            SELECT column_name INTO p_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) = 'passed' LIMIT 1;
            SELECT column_name INTO a_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) = 'answers' LIMIT 1;
            SELECT column_name INTO t_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) IN ('takenat', 'taken_at') ORDER BY (column_name = 'takenAt') DESC LIMIT 1;
            SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) IN ('createdat', 'created_at') ORDER BY (column_name = 'createdAt') DESC LIMIT 1;
            SELECT column_name INTO up_col FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND LOWER(column_name) IN ('updatedat', 'updated_at') ORDER BY (column_name = 'updatedAt') DESC LIMIT 1;

            EXECUTE format('
                INSERT INTO "ExamResult_New" (id, user_id, exam_id, score, max_score, passed, answers, taken_at, created_at, updated_at)
                SELECT id::uuid, %s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s
                FROM "ExamResult"',
                COALESCE(quote_ident(u_col), 'NULL'),
                COALESCE(quote_ident(e_col), 'NULL'),
                COALESCE(quote_ident(s_col), '0'),
                COALESCE(quote_ident(m_col), '0'),
                COALESCE(quote_ident(p_col), 'false'),
                COALESCE(quote_ident(a_col), 'NULL'),
                COALESCE(quote_ident(t_col), 'CURRENT_TIMESTAMP'),
                COALESCE(quote_ident(c_col), 'CURRENT_TIMESTAMP'),
                COALESCE(quote_ident(up_col), 'CURRENT_TIMESTAMP'));

            DROP TABLE "ExamResult" CASCADE;
            ALTER TABLE "ExamResult_New" RENAME TO "ExamResult";
            CREATE INDEX IF NOT EXISTS idx_examresult_user_taken ON "ExamResult" (user_id, taken_at DESC);
        END;
    END IF;
END $$;

-- ============================================================
-- 2. Partitioning for AIMessage table
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'aimessage') AND NOT EXISTS (SELECT 1 FROM pg_partitioned_table pt JOIN pg_class c ON pt.partrelid = c.oid WHERE c.relname = 'AIMessage') THEN
        CREATE TABLE IF NOT EXISTS "AIMessage_New" (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            conversation_id uuid NOT NULL,
            role text NOT NULL,
            content text,
            created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "AIMessage_New_pkey" PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);

        DECLARE
            start_date date := date_trunc('month', CURRENT_DATE - interval '3 months');
            end_date date := date_trunc('month', CURRENT_DATE + interval '4 months');
            partition_name text;
            c_id_col text; c_at_col text; u_at_col text;
        BEGIN
            WHILE start_date < end_date LOOP
                partition_name := 'aimessage_p' || to_char(start_date, 'YYYY_MM');
                EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF "AIMessage_New" FOR VALUES FROM (%L) TO (%L)', partition_name, to_char(start_date, 'YYYY-MM-DD'), to_char(start_date + interval '1 month', 'YYYY-MM-DD'));
                start_date := start_date + interval '1 month';
            END LOOP;
            
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'aimessage_pdefault') THEN
                CREATE TABLE "aimessage_pdefault" PARTITION OF "AIMessage_New" DEFAULT;
            END IF;

            SELECT column_name INTO c_id_col FROM information_schema.columns WHERE LOWER(table_name) = 'aimessage' AND LOWER(column_name) IN ('conversationid', 'conversation_id') ORDER BY (column_name = 'conversationId') DESC LIMIT 1;
            SELECT column_name INTO c_at_col FROM information_schema.columns WHERE LOWER(table_name) = 'aimessage' AND LOWER(column_name) IN ('createdat', 'created_at') ORDER BY (column_name = 'createdAt') DESC LIMIT 1;
            SELECT column_name INTO u_at_col FROM information_schema.columns WHERE LOWER(table_name) = 'aimessage' AND LOWER(column_name) IN ('updatedat', 'updated_at') ORDER BY (column_name = 'updatedAt') DESC LIMIT 1;

            EXECUTE format('
                INSERT INTO "AIMessage_New" (id, conversation_id, role, content, created_at, updated_at)
                SELECT id::uuid, %s::uuid, role, content, %s, %s
                FROM "AIMessage"',
                COALESCE(quote_ident(c_id_col), 'NULL'), 
                COALESCE(quote_ident(c_at_col), 'CURRENT_TIMESTAMP'), 
                COALESCE(quote_ident(u_at_col), 'CURRENT_TIMESTAMP'));

            DROP TABLE "AIMessage" CASCADE;
            ALTER TABLE "AIMessage_New" RENAME TO "AIMessage";
            CREATE INDEX IF NOT EXISTS idx_aimessage_conversation ON "AIMessage" (conversation_id, created_at DESC);
        END;
    END IF;
END $$;

-- ============================================================
-- 3. Partitioning for AuditLog table
-- ============================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'auditlog') AND NOT EXISTS (SELECT 1 FROM pg_partitioned_table pt JOIN pg_class c ON pt.partrelid = c.oid WHERE c.relname = 'AuditLog') THEN
        CREATE TABLE IF NOT EXISTS "AuditLog_New" (
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

        DECLARE
            start_date date := date_trunc('month', CURRENT_DATE - interval '3 months');
            end_date date := date_trunc('month', CURRENT_DATE + interval '4 months');
            partition_name text;
            u_id_col text; e_t_col text; ip_col text; ua_col text; c_at_col text;
        BEGIN
            WHILE start_date < end_date LOOP
                partition_name := 'auditlog_p' || to_char(start_date, 'YYYY_MM');
                EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF "AuditLog_New" FOR VALUES FROM (%L) TO (%L)', partition_name, to_char(start_date, 'YYYY-MM-DD'), to_char(start_date + interval '1 month', 'YYYY-MM-DD'));
                start_date := start_date + interval '1 month';
            END LOOP;

            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditlog_pdefault') THEN
                CREATE TABLE "auditlog_pdefault" PARTITION OF "AuditLog_New" DEFAULT;
            END IF;

            SELECT column_name INTO u_id_col FROM information_schema.columns WHERE LOWER(table_name) = 'auditlog' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
            SELECT column_name INTO e_t_col FROM information_schema.columns WHERE LOWER(table_name) = 'auditlog' AND LOWER(column_name) IN ('eventtype', 'event_type') ORDER BY (column_name = 'eventType') DESC LIMIT 1;
            SELECT column_name INTO ip_col FROM information_schema.columns WHERE LOWER(table_name) = 'auditlog' AND LOWER(column_name) IN ('ipaddress', 'ip_address') ORDER BY (column_name = 'ipAddress') DESC LIMIT 1;
            SELECT column_name INTO ua_col FROM information_schema.columns WHERE LOWER(table_name) = 'auditlog' AND LOWER(column_name) IN ('useragent', 'user_agent') ORDER BY (column_name = 'userAgent') DESC LIMIT 1;
            SELECT column_name INTO c_at_col FROM information_schema.columns WHERE LOWER(table_name) = 'auditlog' AND LOWER(column_name) IN ('createdat', 'created_at') ORDER BY (column_name = 'createdAt') DESC LIMIT 1;

            EXECUTE format('
                INSERT INTO "AuditLog_New" (id, user_id, event_type, description, metadata, ip_address, user_agent, created_at)
                SELECT id::uuid, %s::uuid, %s, description, metadata, %s, %s, %s
                FROM "AuditLog"',
                COALESCE(quote_ident(u_id_col), 'NULL'), 
                COALESCE(quote_ident(e_t_col), '''UNKNOWN'''), 
                COALESCE(quote_ident(ip_col), 'NULL'), 
                COALESCE(quote_ident(ua_col), 'NULL'), 
                COALESCE(quote_ident(c_at_col), 'CURRENT_TIMESTAMP'));

            DROP TABLE "AuditLog" CASCADE;
            ALTER TABLE "AuditLog_New" RENAME TO "AuditLog";
            CREATE INDEX IF NOT EXISTS idx_auditlog_user_created ON "AuditLog" (user_id, created_at DESC);
        END;
    END IF;
END $$;