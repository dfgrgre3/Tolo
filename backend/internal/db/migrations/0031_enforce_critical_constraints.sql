-- Migration 0031: Enforce Critical Data Integrity Constraints
-- Closes all remaining gaps in DB-level constraints to eliminate
-- race conditions, orphaned records, and data corruption.
--
-- This migration makes the database the source of truth for data integrity,
-- replacing all ad-hoc application-level checks and patch scripts.

BEGIN;

-- ============================================================
-- 1. MISSING FOREIGN KEYS
-- ============================================================

-- WalletTransaction → User
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_wallet_tx_user') THEN
    ALTER TABLE "WalletTransaction" ADD CONSTRAINT fk_wallet_tx_user
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- UserSession → User
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_session_user') THEN
    ALTER TABLE "UserSession" ADD CONSTRAINT fk_user_session_user
      FOREIGN KEY ("user_id") REFERENCES "User"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Payment → Subject (optional FK, SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_subject') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT fk_payment_subject
      FOREIGN KEY ("subject_id") REFERENCES "Subject"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Invoice → Payment
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoice_payment') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT fk_invoice_payment
      FOREIGN KEY ("payment_id") REFERENCES "Payment"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Invoice → User
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoice_user') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT fk_invoice_user
      FOREIGN KEY ("user_id") REFERENCES "User"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- LessonAttachment → SubTopic
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lesson_attachment_subtopic') THEN
    ALTER TABLE "LessonAttachment" ADD CONSTRAINT fk_lesson_attachment_subtopic
      FOREIGN KEY ("sub_topic_id") REFERENCES "SubTopic"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- SubTopic → Exam (optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_subtopic_exam') THEN
    ALTER TABLE "SubTopic" ADD CONSTRAINT fk_subtopic_exam
      FOREIGN KEY ("exam_id") REFERENCES "Exam"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- UserSettings → User
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_settings_user') THEN
    ALTER TABLE "UserSettings" ADD CONSTRAINT fk_user_settings_user
      FOREIGN KEY ("user_id") REFERENCES "User"(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. MISSING UNIQUE CONSTRAINTS
-- ============================================================

-- UserSettings: one settings row per user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_settings_user_id') THEN
    ALTER TABLE "UserSettings" ADD CONSTRAINT uq_user_settings_user_id UNIQUE ("user_id");
  END IF;
END $$;

-- User.referral_code: unique when not null
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_user_referral_code') THEN
    CREATE UNIQUE INDEX uq_user_referral_code ON "User" ("referral_code")
      WHERE "referral_code" IS NOT NULL;
  END IF;
END $$;

-- LessonProgress: one progress row per user per lesson
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_lesson_progress_user_lesson') THEN
    ALTER TABLE "TopicProgress" ADD CONSTRAINT uq_lesson_progress_user_lesson
      UNIQUE ("user_id", "sub_topic_id");
  END IF;
END $$;

-- UserSession.refresh_token: already has uniqueIndex in model, ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_user_session_refresh_token') THEN
    CREATE UNIQUE INDEX uq_user_session_refresh_token ON "UserSession" ("refresh_token");
  END IF;
END $$;

-- Payment.reference: already has uniqueIndex in model, ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_payment_reference') THEN
    CREATE UNIQUE INDEX uq_payment_reference ON "Payment" ("reference");
  END IF;
END $$;

-- Invoice.invoice_number: already has uniqueIndex in model
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_invoice_number') THEN
    CREATE UNIQUE INDEX uq_invoice_number ON "Invoice" ("invoice_number");
  END IF;
END $$;

-- Invoice.payment_id: already has uniqueIndex in model
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_invoice_payment_id') THEN
    CREATE UNIQUE INDEX uq_invoice_payment_id ON "Invoice" ("payment_id");
  END IF;
END $$;

-- ============================================================
-- 3. MISSING CHECK CONSTRAINTS
-- ============================================================

-- UserSession.status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_session_status') THEN
    ALTER TABLE "UserSession" ADD CONSTRAINT chk_session_status
      CHECK ("status" IN ('active', 'expired', 'revoked'));
  END IF;
END $$;

-- WalletTransaction.amount must be positive
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_tx_amount_positive') THEN
    ALTER TABLE "WalletTransaction" ADD CONSTRAINT chk_wallet_tx_amount_positive
      CHECK ("amount" > 0);
  END IF;
END $$;

-- WalletTransaction.wallet_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_tx_wallet_type') THEN
    ALTER TABLE "WalletTransaction" ADD CONSTRAINT chk_wallet_tx_wallet_type
      CHECK ("walletType" IN ('BALANCE', 'AI_CREDITS', 'EXAM_CREDITS'));
  END IF;
END $$;

-- Payment.method validation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_method') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT chk_payment_method
      CHECK ("method" IN ('PAYMOB', 'WALLET', 'STRIPE', 'MANUAL', 'FREE'));
  END IF;
END $$;

-- Payment.status (fix existing constraint if mismatched)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_status') THEN
    ALTER TABLE "Payment" DROP CONSTRAINT chk_payment_status;
  END IF;
  ALTER TABLE "Payment" ADD CONSTRAINT chk_payment_status
    CHECK ("status" IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'));
END $$;

-- User.version for optimistic locking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_version_positive') THEN
    ALTER TABLE "User" ADD CONSTRAINT chk_user_version_positive
      CHECK ("version" >= 1);
  END IF;
END $$;

-- Enrollment.progress (already in 0024, ensure exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_enrollment_progress') THEN
    ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT chk_enrollment_progress
      CHECK ("progress" >= 0 AND "progress" <= 100);
  END IF;
END $$;

-- ============================================================
-- 4. NOT NULL CONSTRAINTS ON CRITICAL COLUMNS
-- ============================================================

-- WalletTransaction: ensure critical fields are NOT NULL
ALTER TABLE "WalletTransaction" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "WalletTransaction" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "WalletTransaction" ALTER COLUMN "amount" SET NOT NULL;
ALTER TABLE "WalletTransaction" ALTER COLUMN "currency" SET NOT NULL;
ALTER TABLE "WalletTransaction" ALTER COLUMN "walletType" SET NOT NULL;

-- UserSession: ensure critical fields are NOT NULL
ALTER TABLE "UserSession" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "UserSession" ALTER COLUMN "ip" SET NOT NULL;
ALTER TABLE "UserSession" ALTER COLUMN "refresh_token" SET NOT NULL;

-- Invoice: ensure critical fields are NOT NULL
ALTER TABLE "Invoice" ALTER COLUMN "payment_id" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "invoice_number" SET NOT NULL;

-- Payment: ensure critical fields are NOT NULL
ALTER TABLE "Payment" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "amount" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "currency" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "method" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "reference" SET NOT NULL;

-- ============================================================
-- 5. PERFORMANCE INDEXES FOR COMMON QUERIES
-- ============================================================

-- WalletTransaction: by user and type
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_type ON "WalletTransaction" ("userId", "type");
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON "WalletTransaction" ("userId", "createdAt" DESC);

-- UserSession: active sessions by user
CREATE INDEX IF NOT EXISTS idx_user_session_user_active ON "UserSession" ("user_id", "is_active")
  WHERE "is_active" = true;

-- Payment: by user and status
CREATE INDEX IF NOT EXISTS idx_payment_user_status ON "Payment" ("userId", "status");
CREATE INDEX IF NOT EXISTS idx_payment_status_created ON "Payment" ("status", "createdAt" DESC);

-- Enrollment: by user
CREATE INDEX IF NOT EXISTS idx_enrollment_user ON "SubjectEnrollment" ("userId");

-- LessonProgress: by user
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON "TopicProgress" ("userId");

-- Invoice: by user
CREATE INDEX IF NOT EXISTS idx_invoice_user ON "Invoice" ("user_id");

-- ============================================================
-- 6. CLEANUP: Remove orphaned records that violate new constraints
-- ============================================================

-- Delete WalletTransaction rows with non-existent users
DELETE FROM "WalletTransaction" WHERE "userId" NOT IN (SELECT id FROM "User");

-- Delete UserSession rows with non-existent users
DELETE FROM "UserSession" WHERE "user_id" NOT IN (SELECT id FROM "User");

-- Delete Payment rows with non-existent users
DELETE FROM "Payment" WHERE "userId" NOT IN (SELECT id FROM "User");

-- Delete Invoice rows with non-existent users or payments
DELETE FROM "Invoice" WHERE "user_id" NOT IN (SELECT id FROM "User");
DELETE FROM "Invoice" WHERE "payment_id" NOT IN (SELECT id FROM "Payment");

-- Delete LessonAttachment rows with non-existent subtopics
DELETE FROM "LessonAttachment" WHERE "sub_topic_id" NOT IN (SELECT id FROM "SubTopic");

-- Delete UserSettings rows with non-existent users
DELETE FROM "UserSettings" WHERE "user_id" NOT IN (SELECT id FROM "User");

-- Delete TopicProgress rows with non-existent users
DELETE FROM "TopicProgress" WHERE "user_id" NOT IN (SELECT id FROM "User");

-- ============================================================
-- 7. TRIGGER: Auto-update updated_at on critical tables
-- ============================================================

-- WalletTransaction
DROP TRIGGER IF EXISTS trg_wallet_tx_updated_at ON "WalletTransaction";
CREATE TRIGGER trg_wallet_tx_updated_at
  BEFORE UPDATE ON "WalletTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- UserSession
DROP TRIGGER IF EXISTS trg_user_session_updated_at ON "UserSession";
CREATE TRIGGER trg_user_session_updated_at
  BEFORE UPDATE ON "UserSession"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Invoice
DROP TRIGGER IF EXISTS trg_invoice_updated_at ON "Invoice";
CREATE TRIGGER trg_invoice_updated_at
  BEFORE UPDATE ON "Invoice"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Payment
DROP TRIGGER IF EXISTS trg_payment_updated_at ON "Payment";
CREATE TRIGGER trg_payment_updated_at
  BEFORE UPDATE ON "Payment"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Migration 0031 Complete
-- ============================================================
-- All critical constraints are now enforced at the database level.
-- Ad-hoc patch scripts (fix_*.sql, fix_*.go, clean-*) are obsolete.

COMMIT;
