-- Migration: 0006_safe_deletes.sql
-- Purpose: Replace CASCADE deletes with soft deletes for data safety
-- This prevents accidental data loss and enables recovery
-- Date: 2026-05-03

-- ============================================================
-- 1. Create audit table for deleted records
-- ============================================================
CREATE TABLE IF NOT EXISTS "DeletedRecordArchive" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    record_id TEXT NOT NULL,
    user_id TEXT,
    data JSONB NOT NULL,
    reason VARCHAR(500),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deleted_archive_table ON "DeletedRecordArchive"(table_name, "createdAt" DESC);
CREATE INDEX idx_deleted_archive_user ON "DeletedRecordArchive"(user_id, "createdAt" DESC);

-- ============================================================
-- 2. Modify Payment table - never CASCADE delete
-- ============================================================
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS fk_payment_user;
ALTER TABLE "Payment" ADD CONSTRAINT fk_payment_user 
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT;

-- ============================================================
-- 3. Modify Invoice - keep for audit trail
-- ============================================================
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS fk_invoice_payment;
ALTER TABLE "Invoice" ADD CONSTRAINT fk_invoice_payment 
    FOREIGN KEY ("paymentId") REFERENCES "Payment"(id) ON DELETE RESTRICT;

-- ============================================================
-- 4. Modify Subscription - prevent cascade
-- ============================================================
ALTER TABLE "UserSubscription" DROP CONSTRAINT IF EXISTS fk_usersub_user;
ALTER TABLE "UserSubscription" ADD CONSTRAINT fk_usersub_user 
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT;

-- ============================================================
-- 5. Add "archiveReason" column to key tables for audit
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'archiveReason') THEN
        ALTER TABLE "User" ADD COLUMN "archiveReason" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND column_name = 'archiveReason') THEN
        ALTER TABLE "Payment" ADD COLUMN "archiveReason" TEXT;
    END IF;
END $$;

-- ============================================================
-- 6. Update existing soft delete constraints
-- ============================================================
ALTER TABLE "SubjectEnrollment" DROP CONSTRAINT IF EXISTS fk_enrollment_user;
ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT fk_enrollment_user 
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT;

ALTER TABLE "TopicProgress" DROP CONSTRAINT IF EXISTS fk_progress_user;
ALTER TABLE "TopicProgress" ADD CONSTRAINT fk_progress_user 
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT;

ALTER TABLE "WalletTransaction" DROP CONSTRAINT IF EXISTS fk_wallet_user;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT fk_wallet_user 
    FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT;

-- ============================================================
-- 7. Prevent accidental data loss - audit triggers
-- ============================================================
CREATE OR REPLACE FUNCTION audit_delete_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "DeletedRecordArchive" (table_name, record_id, user_id, data, reason)
    VALUES ('User', OLD.id, OLD.id, row_to_json(OLD), OLD."archiveReason");
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_delete_payment() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "DeletedRecordArchive" (table_name, record_id, user_id, data, reason)
    VALUES ('Payment', OLD.id, OLD."userId", row_to_json(OLD), OLD."archiveReason");
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_user_delete ON "User";
DROP TRIGGER IF EXISTS audit_payment_delete ON "Payment";

-- Create audit triggers
CREATE TRIGGER audit_user_delete
BEFORE DELETE ON "User"
FOR EACH ROW
EXECUTE FUNCTION audit_delete_user();

CREATE TRIGGER audit_payment_delete
BEFORE DELETE ON "Payment"
FOR EACH ROW
EXECUTE FUNCTION audit_delete_payment();

-- ============================================================
-- 8. Create views for "active" records only
-- ============================================================
CREATE OR REPLACE VIEW "ActiveUsers" AS
SELECT * FROM "User" WHERE "deletedAt" IS NULL;

CREATE OR REPLACE VIEW "ActivePayments" AS
SELECT * FROM "Payment" WHERE "deletedAt" IS NULL;

CREATE OR REPLACE VIEW "ActiveEnrollments" AS
SELECT * FROM "SubjectEnrollment" WHERE "deletedAt" IS NULL;

-- ============================================================
-- 9. Document safe deletion patterns
-- ============================================================
-- Instead of DELETE: UPDATE table SET "deletedAt" = NOW() WHERE id = ?;
-- For recovery: UPDATE table SET "deletedAt" = NULL WHERE id = ?;
-- To permanently delete (with caution):
-- 1. Archive to "DeletedRecordArchive" (automatic via trigger)
-- 2. DELETE FROM table WHERE id = ?;
