-- Migration: 0004_comprehensive_improvements.sql
-- Purpose: Add missing indexes, constraints, and sync schema with new User fields
-- Date: 2026-05-02

-- ============================================================
-- 1. New User columns (gamification stats + multi-layer XP)
-- ============================================================
DO $$
BEGIN
    -- Gamification stats
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('currentstreak', 'current_streak')) THEN
        ALTER TABLE "User" ADD COLUMN "current_streak" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('longeststreak', 'longest_streak')) THEN
        ALTER TABLE "User" ADD COLUMN "longest_streak" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('totalstudytime', 'total_study_time')) THEN
        ALTER TABLE "User" ADD COLUMN "total_study_time" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('taskscompleted', 'tasks_completed')) THEN
        ALTER TABLE "User" ADD COLUMN "tasks_completed" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('examspassed', 'exams_passed')) THEN
        ALTER TABLE "User" ADD COLUMN "exams_passed" integer NOT NULL DEFAULT 0;
    END IF;
    -- Multi-layer XP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('studyxp', 'study_xp')) THEN
        ALTER TABLE "User" ADD COLUMN "study_xp" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('taskxp', 'task_xp')) THEN
        ALTER TABLE "User" ADD COLUMN "task_xp" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('examxp', 'exam_xp')) THEN
        ALTER TABLE "User" ADD COLUMN "exam_xp" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('challengexp', 'challenge_xp')) THEN
        ALTER TABLE "User" ADD COLUMN "challenge_xp" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('questxp', 'quest_xp')) THEN
        ALTER TABLE "User" ADD COLUMN "quest_xp" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('seasonxp', 'season_xp')) THEN
        ALTER TABLE "User" ADD COLUMN "season_xp" integer NOT NULL DEFAULT 0;
    END IF;
    -- Last login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('lastlogin', 'last_login')) THEN
        ALTER TABLE "User" ADD COLUMN "last_login" timestamptz;
    END IF;
END $$;

-- ============================================================
-- 2. Missing UNIQUE constraints (prevent duplicate records)
-- ============================================================
DO $$
DECLARE
    u_col text;
    a_col text;
    c_col text;
BEGIN
    -- 1. Fix UserAchievement
    SELECT column_name INTO u_col 
    FROM information_schema.columns 
    WHERE LOWER(table_name) = 'userachievement' AND LOWER(column_name) IN ('userid', 'user_id')
    ORDER BY (column_name = 'userId') DESC, (column_name = 'user_id') DESC
    LIMIT 1;

    SELECT column_name INTO a_col 
    FROM information_schema.columns 
    WHERE LOWER(table_name) = 'userachievement' AND LOWER(column_name) IN ('achievementid', 'achievement_id')
    ORDER BY (column_name = 'achievementId') DESC, (column_name = 'achievement_id') DESC
    LIMIT 1;

    IF u_col IS NOT NULL AND a_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_achievement') THEN
        -- Remove duplicates first (keep first by id - earliest created)
        EXECUTE format('
            DELETE FROM "UserAchievement" WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY %I, %I ORDER BY id) as rn
                    FROM "UserAchievement"
                ) sub WHERE rn > 1
            )', u_col, a_col);
        EXECUTE format('ALTER TABLE "UserAchievement" ADD CONSTRAINT unique_user_achievement UNIQUE (%I, %I)', u_col, a_col);
    END IF;

    -- 2. Fix UserChallenge
    SELECT column_name INTO u_col 
    FROM information_schema.columns 
    WHERE LOWER(table_name) = 'userchallenge' AND LOWER(column_name) IN ('userid', 'user_id')
    ORDER BY (column_name = 'userId') DESC, (column_name = 'user_id') DESC
    LIMIT 1;

    SELECT column_name INTO c_col 
    FROM information_schema.columns 
    WHERE LOWER(table_name) = 'userchallenge' AND LOWER(column_name) IN ('challengeid', 'challenge_id')
    ORDER BY (column_name = 'challengeId') DESC, (column_name = 'challenge_id') DESC
    LIMIT 1;

    IF u_col IS NOT NULL AND c_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_challenge') THEN
        -- Remove duplicates first (keep first by id - earliest created)
        EXECUTE format('
            DELETE FROM "UserChallenge" WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY %I, %I ORDER BY id) as rn
                    FROM "UserChallenge"
                ) sub WHERE rn > 1
            )', u_col, c_col);
        EXECUTE format('ALTER TABLE "UserChallenge" ADD CONSTRAINT unique_user_challenge UNIQUE (%I, %I)', u_col, c_col);
    END IF;
END $$;

-- ============================================================
-- 3. Missing CHECK constraints (data integrity)
-- ============================================================
DO $$
DECLARE
    target_col text;
BEGIN
    -- WalletTransaction: amount must not be zero
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'wallettransaction' AND column_name = 'amount') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_txn_amount_nonzero') THEN
            ALTER TABLE "WalletTransaction" ADD CONSTRAINT chk_wallet_txn_amount_nonzero CHECK (amount != 0);
        END IF;
    END IF;

    -- Coupon: discount value must be positive
    SELECT column_name INTO target_col FROM information_schema.columns WHERE LOWER(table_name) = 'coupon' AND LOWER(column_name) IN ('discountvalue', 'discount_value') ORDER BY (column_name = 'discountValue') DESC LIMIT 1;
    IF target_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupon_discount_positive') THEN
        EXECUTE format('ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_discount_positive CHECK (%I > 0)', target_col);
    END IF;

    -- Coupon: used count must be non-negative
    SELECT column_name INTO target_col FROM information_schema.columns WHERE LOWER(table_name) = 'coupon' AND LOWER(column_name) IN ('usedcount', 'used_count') ORDER BY (column_name = 'usedCount') DESC LIMIT 1;
    IF target_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupon_used_nonnegative') THEN
        EXECUTE format('ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_used_nonnegative CHECK (%I >= 0)', target_col);
    END IF;

    -- SubscriptionPlan: price must be non-negative
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'subscriptionplan' AND column_name = 'price') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_price_nonnegative') THEN
            ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT chk_plan_price_nonnegative CHECK (price >= 0);
        END IF;
    END IF;

    -- ExamResult: score must be non-negative
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE LOWER(table_name) = 'examresult' AND column_name = 'score') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exam_result_score_nonnegative') THEN
            ALTER TABLE "ExamResult" ADD CONSTRAINT chk_exam_result_score_nonnegative CHECK (score >= 0);
        END IF;
    END IF;

    -- User: streak and stats must be non-negative
    SELECT column_name INTO target_col FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('currentstreak', 'current_streak') ORDER BY (column_name = 'currentStreak') DESC LIMIT 1;
    IF target_col IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_streak_nonnegative') THEN
        EXECUTE format('ALTER TABLE "User" ADD CONSTRAINT chk_user_streak_nonnegative CHECK (%I >= 0)', target_col);
    END IF;
END $$;

-- ============================================================
-- 4. Missing performance indexes
-- ============================================================
DO $$
DECLARE
    u_col text;
    t_col text;
    c_col text;
BEGIN
    -- WalletTransaction: filter by wallet type
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'wallettransaction' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    SELECT column_name INTO t_col FROM information_schema.columns WHERE LOWER(table_name) = 'wallettransaction' AND LOWER(column_name) IN ('wallettype', 'wallet_type') ORDER BY (column_name = 'walletType') DESC LIMIT 1;
    SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'wallettransaction' AND LOWER(column_name) IN ('createdat', 'created_at') ORDER BY (column_name = 'createdAt') DESC LIMIT 1;
    IF u_col IS NOT NULL AND t_col IS NOT NULL AND c_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_wallet_txn_user_type_created' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_wallet_txn_user_type_created ON "WalletTransaction" (%I, %I, %I DESC)', u_col, t_col, c_col);
        END IF;
    END IF;

    -- UserSubscription: find active subscription
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'usersubscription' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    IF u_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_user_sub_user_status' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_user_sub_user_status ON "UserSubscription" (%I, status)', u_col);
        END IF;
    END IF;

    -- UserSubscription: cron job for expiration
    SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'usersubscription' AND LOWER(column_name) IN ('enddate', 'end_date') ORDER BY (column_name = 'endDate') DESC LIMIT 1;
    IF c_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_user_sub_active_end_date' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_user_sub_active_end_date ON "UserSubscription" (%I) WHERE status = ''ACTIVE''', c_col);
        END IF;
    END IF;

    -- Coupon: validation lookup
    SELECT column_name INTO t_col FROM information_schema.columns WHERE LOWER(table_name) = 'coupon' AND LOWER(column_name) IN ('isactive', 'is_active') ORDER BY (column_name = 'isActive') DESC LIMIT 1;
    IF t_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_coupon_code_active' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_coupon_code_active ON "Coupon" (code, %I)', t_col);
        END IF;
    END IF;

    -- AI Conversations: user listing
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'ai_conversations' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'ai_conversations' AND LOWER(column_name) IN ('createdat', 'created_at') ORDER BY (column_name = 'createdAt') DESC LIMIT 1;
    IF u_col IS NOT NULL AND c_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_ai_conv_user_created' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_ai_conv_user_created ON "ai_conversations" (%I, %I DESC)', u_col, c_col);
        END IF;
    END IF;

    -- AI Messages: ordered by conversation
    SELECT column_name INTO t_col FROM information_schema.columns WHERE LOWER(table_name) = 'ai_messages' AND LOWER(column_name) IN ('conversationid', 'conversation_id') ORDER BY (column_name = 'conversationId') DESC LIMIT 1;
    SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'ai_messages' AND LOWER(column_name) IN ('createdat', 'created_at') ORDER BY (column_name = 'createdAt') DESC LIMIT 1;
    IF t_col IS NOT NULL AND c_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_ai_msg_conv_created' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_ai_msg_conv_created ON "ai_messages" (%I, %I)', t_col, c_col);
        END IF;
    END IF;

    -- User: lastLogin for admin analytics
    SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('lastlogin', 'last_login') ORDER BY (column_name = 'lastLogin') DESC LIMIT 1;
    IF c_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_user_last_login' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_user_last_login ON "User" (%I DESC) WHERE %I IS NOT NULL', c_col, c_col);
        END IF;
    END IF;

    -- User: gamification leaderboard
    SELECT column_name INTO c_col FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('totalxp', 'total_xp') ORDER BY (column_name = 'totalXP') DESC LIMIT 1;
    IF c_col IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_user_total_xp_desc' AND n.nspname = 'public') THEN
            EXECUTE format('CREATE INDEX idx_user_total_xp_desc ON "User" (%I DESC) WHERE "deletedAt" IS NULL', c_col);
        END IF;
    END IF;
END $$;
