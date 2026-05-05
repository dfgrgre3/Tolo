-- Migration: 0005_critical_fixes.sql
-- Purpose: Fix AI table names, add missing foreign keys, CHECK constraints, Soft Deletes, and indexes.
-- Date: 2026-05-02

-- ============================================================
-- 1. Rename AI tables to PascalCase (match PrismaNamingStrategy)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'ai_messages') AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIMessage') THEN
        ALTER TABLE "ai_messages" RENAME TO "AIMessage";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'ai_conversations') AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIConversation') THEN
        ALTER TABLE "ai_conversations" RENAME TO "AIConversation";
    END IF;
END $$;

-- ============================================================
-- 2. Add Soft Delete (deletedAt) to missing models
-- ============================================================
DO $$
DECLARE
    t_names text[] := ARRAY['Task', 'StudySession', 'Schedule', 'Reminder', 'Achievement', 'Reward', 'Season', 'Challenge', 'UserAchievement', 'UserChallenge', 'Coupon', 'Automation', 'ABExperiment', 'AIMessage', 'AIConversation'];
    t_name text;
BEGIN
    FOREACH t_name IN ARRAY t_names LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = LOWER(t_name)) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = LOWER(t_name) AND LOWER(column_name) = 'deletedat') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN "deletedAt" timestamptz', t_name);
                EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I ("deletedAt")', 'idx_' || LOWER(t_name) || '_deleted_at', t_name);
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 3. Add Missing Foreign Keys
-- ============================================================
DO $$
DECLARE
    u_col text;
    a_col text;
    c_col text;
BEGIN
    -- Helper to detect columns and add FK
    -- 1. Task -> User
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'task') THEN
        SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'task' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
        IF u_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_user') THEN
            EXECUTE format('ALTER TABLE "Task" ADD CONSTRAINT fk_task_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE CASCADE', u_col);
        END IF;
    END IF;

    -- 2. UserAchievement -> User/Achievement
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'userachievement') THEN
        SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'userachievement' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
        SELECT column_name INTO a_col FROM information_schema.columns WHERE LOWER(table_name) = 'userachievement' AND LOWER(column_name) IN ('achievementid', 'achievement_id') ORDER BY (column_name = 'achievementId') DESC LIMIT 1;
        
        IF u_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userachievement_user') THEN
            EXECUTE format('ALTER TABLE "UserAchievement" ADD CONSTRAINT fk_userachievement_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE CASCADE', u_col);
        END IF;
        IF a_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userachievement_achievement') THEN
            EXECUTE format('ALTER TABLE "UserAchievement" ADD CONSTRAINT fk_userachievement_achievement FOREIGN KEY (%I) REFERENCES "Achievement"(id) ON DELETE CASCADE', a_col);
        END IF;
    END IF;

    -- 3. UserChallenge -> User/Challenge
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'userchallenge') THEN
        SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'userchallenge' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
        SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'userchallenge' AND LOWER(column_name) IN ('challengeid', 'challenge_id') ORDER BY (column_name = 'challengeId') DESC LIMIT 1;
        
        IF u_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userchallenge_user') THEN
            EXECUTE format('ALTER TABLE "UserChallenge" ADD CONSTRAINT fk_userchallenge_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE CASCADE', u_col);
        END IF;
        IF c_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_userchallenge_challenge') THEN
            EXECUTE format('ALTER TABLE "UserChallenge" ADD CONSTRAINT fk_userchallenge_challenge FOREIGN KEY (%I) REFERENCES "Challenge"(id) ON DELETE CASCADE', c_col);
        END IF;
    END IF;
END $$;

-- ============================================================
-- 4. Add Missing CHECK Constraints
-- ============================================================
DO $$
DECLARE
    target_col text;
BEGIN
    -- User balances
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'user') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_balance_nonneg') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND column_name = 'balance') THEN
            ALTER TABLE "User" ADD CONSTRAINT chk_user_balance_nonneg CHECK (balance >= 0);
        END IF;
        
        SELECT column_name INTO target_col FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('aicredits', 'ai_credits') ORDER BY (column_name = 'aiCredits') DESC LIMIT 1;
        IF target_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_ai_credits_nonneg') THEN
            EXECUTE format('ALTER TABLE "User" ADD CONSTRAINT chk_user_ai_credits_nonneg CHECK (%I >= 0)', target_col);
        END IF;
    END IF;
END $$;

-- ============================================================
-- 5. Add Performance Indexes
-- ============================================================
DO $$
DECLARE
    u_col text;
    d_col text;
BEGIN
    -- Task: user + due date
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE LOWER(table_name) = 'task') THEN
        SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'task' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
        SELECT column_name INTO d_col FROM information_schema.columns WHERE LOWER(table_name) = 'task' AND LOWER(column_name) IN ('dueat', 'due_at') ORDER BY (column_name = 'dueAt') DESC LIMIT 1;
        IF u_col IS NOT NULL AND d_col IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_task_user_due' AND n.nspname = 'public') THEN
                EXECUTE format('CREATE INDEX idx_task_user_due ON "Task" (%I, %I)', u_col, d_col);
            END IF;
        END IF;
    END IF;
END $$;
