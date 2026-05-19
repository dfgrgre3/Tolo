-- Migration 0029: Clean up duplicate constraints and enforce data integrity
-- Resolves issues from ad-hoc scripts (fix_database_issues.go, clean-duplicates)

BEGIN;

-- ============================================================
-- Clean up duplicate constraint/index names from ad-hoc scripts
-- ============================================================

-- The fix_database_issues.go script created 'uni_UserSettings_user_id'
-- Migration 0025 created 'uq_user_settings_user_id'
-- clean-duplicates/main.go created 'idx_user_settings_user_id'
-- Keep only the canonical 'uq_user_settings_user_id' from migration 0025

DO $$
BEGIN
  -- Drop the ad-hoc constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uni_UserSettings_user_id') THEN
    ALTER TABLE "UserSettings" DROP CONSTRAINT "uni_UserSettings_user_id";
  END IF;

  -- Drop the ad-hoc index if it exists
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_settings_user_id') THEN
    DROP INDEX "idx_user_settings_user_id";
  END IF;
END $$;

-- ============================================================
-- Ensure Category has created_at and updated_at columns
-- (was missing and added by fix_database_issues.go ad-hoc script)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Category'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "Category" ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Category'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "Category" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Backfill existing rows
UPDATE "Category" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "Category" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL;

-- Add indexes for Category timestamps
CREATE INDEX IF NOT EXISTS "idx_category_created_at" ON "Category" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_category_updated_at" ON "Category" ("updated_at");

-- ============================================================
-- Add automatic updated_at trigger for Category
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_category_updated_at ON "Category";
CREATE TRIGGER trg_category_updated_at
  BEFORE UPDATE ON "Category"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Add missing UNIQUE constraints for other entities
-- ============================================================

-- Season: name must be unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_season_name'
  ) THEN
    ALTER TABLE "Season" ADD CONSTRAINT uq_season_name UNIQUE ("name");
  END IF;
END $$;

-- Reward: name must be unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_reward_name'
  ) THEN
    ALTER TABLE "Reward" ADD CONSTRAINT uq_reward_name UNIQUE ("name");
  END IF;
END $$;

-- WalletTransaction: prevent duplicate idempotency keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallet_tx_idempotency_key'
  ) THEN
    CREATE UNIQUE INDEX idx_wallet_tx_idempotency_key ON "WalletTransaction" ("idempotency_key")
      WHERE "idempotency_key" IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- Add check constraints for data validity
-- ============================================================

-- Category type must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_category_type'
  ) THEN
    ALTER TABLE "Category" ADD CONSTRAINT chk_category_type
      CHECK ("type" IN ('course', 'library'));
  END IF;
END $$;

-- User role must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_role'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT chk_user_role
      CHECK ("role" IN ('ADMIN', 'TEACHER', 'STUDENT', 'MODERATOR'));
  END IF;
END $$;

-- Payment amount must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_amount_non_negative'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT chk_payment_amount_non_negative
      CHECK ("amount" >= 0);
  END IF;
END $$;

-- Coupon discount value must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupon_discount_value'
  ) THEN
    ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_discount_value
      CHECK ("discountValue" >= 0 AND "discountValue" <= 100);
  END IF;
END $$;

-- ============================================================
-- Add missing foreign key indexes for join performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON "UserSettings" ("user_id");
CREATE INDEX IF NOT EXISTS idx_category_type ON "Category" ("type");

COMMIT;
