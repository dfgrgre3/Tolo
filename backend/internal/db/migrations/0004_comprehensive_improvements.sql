-- Migration: 0004_comprehensive_improvements.sql
-- Purpose: Add missing indexes, constraints, and sync schema with new User fields
-- Date: 2026-05-02

-- ============================================================
-- 1. New User columns (gamification stats + multi-layer XP)
-- ============================================================
DO $$
BEGIN
    -- Gamification stats
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'currentStreak') THEN
        ALTER TABLE "User" ADD COLUMN "currentStreak" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'longestStreak') THEN
        ALTER TABLE "User" ADD COLUMN "longestStreak" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'totalStudyTime') THEN
        ALTER TABLE "User" ADD COLUMN "totalStudyTime" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'tasksCompleted') THEN
        ALTER TABLE "User" ADD COLUMN "tasksCompleted" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'examsPassed') THEN
        ALTER TABLE "User" ADD COLUMN "examsPassed" integer NOT NULL DEFAULT 0;
    END IF;
    -- Multi-layer XP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'studyXP') THEN
        ALTER TABLE "User" ADD COLUMN "studyXP" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'taskXP') THEN
        ALTER TABLE "User" ADD COLUMN "taskXP" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'examXP') THEN
        ALTER TABLE "User" ADD COLUMN "examXP" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'challengeXP') THEN
        ALTER TABLE "User" ADD COLUMN "challengeXP" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'questXP') THEN
        ALTER TABLE "User" ADD COLUMN "questXP" integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'seasonXP') THEN
        ALTER TABLE "User" ADD COLUMN "seasonXP" integer NOT NULL DEFAULT 0;
    END IF;
    -- Last login
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'lastLogin') THEN
        ALTER TABLE "User" ADD COLUMN "lastLogin" timestamptz;
    END IF;
END $$;

-- ============================================================
-- 2. Missing UNIQUE constraints (prevent duplicate records)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_achievement') THEN
        -- Remove duplicates first
        DELETE FROM "UserAchievement" WHERE id NOT IN (
            SELECT MIN(id) FROM "UserAchievement" GROUP BY "userId", "achievementId"
        );
        ALTER TABLE "UserAchievement" ADD CONSTRAINT unique_user_achievement UNIQUE ("userId", "achievementId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_challenge') THEN
        DELETE FROM "UserChallenge" WHERE id NOT IN (
            SELECT MIN(id) FROM "UserChallenge" GROUP BY "userId", "challengeId"
        );
        ALTER TABLE "UserChallenge" ADD CONSTRAINT unique_user_challenge UNIQUE ("userId", "challengeId");
    END IF;
END $$;

-- ============================================================
-- 3. Missing CHECK constraints (data integrity)
-- ============================================================
DO $$
BEGIN
    -- WalletTransaction: amount must not be zero
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_txn_amount_nonzero') THEN
        ALTER TABLE "WalletTransaction" ADD CONSTRAINT chk_wallet_txn_amount_nonzero CHECK (amount != 0);
    END IF;
    -- Coupon: discount value must be positive
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupon_discount_positive') THEN
        ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_discount_positive CHECK ("discountValue" > 0);
    END IF;
    -- Coupon: used count must be non-negative
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupon_used_nonnegative') THEN
        ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_used_nonnegative CHECK ("usedCount" >= 0);
    END IF;
    -- SubscriptionPlan: price must be non-negative
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_price_nonnegative') THEN
        ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT chk_plan_price_nonnegative CHECK (price >= 0);
    END IF;
    -- ExamResult: score must be non-negative
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exam_result_score_nonnegative') THEN
        ALTER TABLE "ExamResult" ADD CONSTRAINT chk_exam_result_score_nonnegative CHECK (score >= 0);
    END IF;
    -- User: streak and stats must be non-negative
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_streak_nonnegative') THEN
        ALTER TABLE "User" ADD CONSTRAINT chk_user_streak_nonnegative CHECK ("currentStreak" >= 0 AND "longestStreak" >= 0);
    END IF;
END $$;

-- ============================================================
-- 4. Missing performance indexes
-- ============================================================

-- WalletTransaction: filter by wallet type
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user_type_created
    ON "WalletTransaction" ("userId", "walletType", "createdAt" DESC);

-- UserSubscription: find active subscription
CREATE INDEX IF NOT EXISTS idx_user_sub_user_status
    ON "UserSubscription" ("userId", status);

-- UserSubscription: cron job for expiration
CREATE INDEX IF NOT EXISTS idx_user_sub_active_end_date
    ON "UserSubscription" ("endDate")
    WHERE status = 'ACTIVE';

-- Coupon: validation lookup
CREATE INDEX IF NOT EXISTS idx_coupon_code_active
    ON "Coupon" (code, "isActive");

-- AI Conversations: user listing
CREATE INDEX IF NOT EXISTS idx_ai_conv_user_created
    ON "ai_conversations" ("userId", "createdAt" DESC);

-- AI Messages: ordered by conversation
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv_created
    ON "ai_messages" ("conversationId", "createdAt");

-- User: lastLogin for admin analytics
CREATE INDEX IF NOT EXISTS idx_user_last_login
    ON "User" ("lastLogin" DESC)
    WHERE "lastLogin" IS NOT NULL;

-- User: gamification leaderboard
CREATE INDEX IF NOT EXISTS idx_user_total_xp_desc
    ON "User" ("totalXP" DESC)
    WHERE "deletedAt" IS NULL;
