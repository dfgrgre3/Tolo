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
DO $$
DECLARE
    u_col text;
BEGIN
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'payment' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    IF u_col IS NOT NULL THEN
        ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS fk_payment_user;
        EXECUTE format('ALTER TABLE "Payment" ADD CONSTRAINT fk_payment_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE RESTRICT', u_col);
    END IF;
END $$;

-- ============================================================
-- 3. Modify Invoice - keep for audit trail
-- ============================================================
DO $$
DECLARE
    p_col text;
BEGIN
    SELECT column_name INTO p_col FROM information_schema.columns WHERE LOWER(table_name) = 'invoice' AND LOWER(column_name) IN ('paymentid', 'payment_id') ORDER BY (column_name = 'paymentId') DESC LIMIT 1;
    IF p_col IS NOT NULL THEN
        ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS fk_invoice_payment;
        EXECUTE format('ALTER TABLE "Invoice" ADD CONSTRAINT fk_invoice_payment FOREIGN KEY (%I) REFERENCES "Payment"(id) ON DELETE RESTRICT', p_col);
    END IF;
END $$;

-- ============================================================
-- 4. Modify Subscription - prevent cascade
-- ============================================================
DO $$
DECLARE
    u_col text;
BEGIN
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'usersubscription' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    IF u_col IS NOT NULL THEN
        ALTER TABLE "UserSubscription" DROP CONSTRAINT IF EXISTS fk_usersub_user;
        EXECUTE format('ALTER TABLE "UserSubscription" ADD CONSTRAINT fk_usersub_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE RESTRICT', u_col);
    END IF;
END $$;

-- ============================================================
-- 5. Add "archiveReason" column to key tables for audit
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND LOWER(column_name) = 'archivereason') THEN
        ALTER TABLE "User" ADD COLUMN "archiveReason" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND LOWER(column_name) = 'archivereason') THEN
        ALTER TABLE "Payment" ADD COLUMN "archiveReason" TEXT;
    END IF;
END $$;

-- ============================================================
-- 6. Update existing soft delete constraints
-- ============================================================
DO $$
DECLARE
    u_col text;
BEGIN
    -- SubjectEnrollment
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'subjectenrollment' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    IF u_col IS NOT NULL THEN
        ALTER TABLE "SubjectEnrollment" DROP CONSTRAINT IF EXISTS fk_enrollment_user;
        EXECUTE format('ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT fk_enrollment_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE RESTRICT', u_col);
    END IF;

    -- TopicProgress
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'topicprogress' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    IF u_col IS NOT NULL THEN
        ALTER TABLE "TopicProgress" DROP CONSTRAINT IF EXISTS fk_progress_user;
        EXECUTE format('ALTER TABLE "TopicProgress" ADD CONSTRAINT fk_progress_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE RESTRICT', u_col);
    END IF;

    -- WalletTransaction
    SELECT column_name INTO u_col FROM information_schema.columns WHERE LOWER(table_name) = 'wallettransaction' AND LOWER(column_name) IN ('userid', 'user_id') ORDER BY (column_name = 'userId') DESC LIMIT 1;
    IF u_col IS NOT NULL THEN
        ALTER TABLE "WalletTransaction" DROP CONSTRAINT IF EXISTS fk_wallet_user;
        EXECUTE format('ALTER TABLE "WalletTransaction" ADD CONSTRAINT fk_wallet_user FOREIGN KEY (%I) REFERENCES "User"(id) ON DELETE RESTRICT', u_col);
    END IF;
END $$;

-- ============================================================
-- 7. Prevent accidental data loss - audit triggers
-- ============================================================
CREATE OR REPLACE FUNCTION audit_delete_user() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "DeletedRecordArchive" (table_name, record_id, user_id, data, reason)
    VALUES ('User', OLD.id, OLD.id, row_to_json(OLD), COALESCE(to_jsonb(OLD)->>'archiveReason', to_jsonb(OLD)->>'archive_reason'));
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_delete_payment() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "DeletedRecordArchive" (table_name, record_id, user_id, data, reason)
    VALUES ('Payment', OLD.id, COALESCE(to_jsonb(OLD)->>'userId', to_jsonb(OLD)->>'user_id'), row_to_json(OLD), COALESCE(to_jsonb(OLD)->>'archiveReason', to_jsonb(OLD)->>'archive_reason'));
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
-- ============================================================
-- 8. Create views for "active" records only
-- ============================================================
DO $$
DECLARE
    d_col text;
BEGIN
    -- ActiveUsers
    SELECT column_name INTO d_col FROM information_schema.columns WHERE LOWER(table_name) = 'user' AND LOWER(column_name) IN ('deletedat', 'deleted_at') ORDER BY (column_name = 'deletedAt') DESC LIMIT 1;
    IF d_col IS NOT NULL THEN
        EXECUTE format('CREATE OR REPLACE VIEW "ActiveUsers" AS SELECT * FROM "User" WHERE %I IS NULL', d_col);
    END IF;

    -- ActivePayments
    SELECT column_name INTO d_col FROM information_schema.columns WHERE LOWER(table_name) = 'payment' AND LOWER(column_name) IN ('deletedat', 'deleted_at') ORDER BY (column_name = 'deletedAt') DESC LIMIT 1;
    IF d_col IS NOT NULL THEN
        EXECUTE format('CREATE OR REPLACE VIEW "ActivePayments" AS SELECT * FROM "Payment" WHERE %I IS NULL', d_col);
    END IF;

    -- ActiveEnrollments
    SELECT column_name INTO d_col FROM information_schema.columns WHERE LOWER(table_name) = 'subjectenrollment' AND LOWER(column_name) IN ('deletedat', 'deleted_at') ORDER BY (column_name = 'deletedAt') DESC LIMIT 1;
    IF d_col IS NOT NULL THEN
        EXECUTE format('CREATE OR REPLACE VIEW "ActiveEnrollments" AS SELECT * FROM "SubjectEnrollment" WHERE %I IS NULL', d_col);
    END IF;
END $$;

-- ============================================================
-- 9. Document safe deletion patterns
-- ============================================================
-- Instead of DELETE: UPDATE table SET "deletedAt" = NOW() WHERE id = ?;
-- For recovery: UPDATE table SET "deletedAt" = NULL WHERE id = ?;
-- To permanently delete (with caution):
-- 1. Archive to "DeletedRecordArchive" (automatic via trigger)
-- 2. DELETE FROM table WHERE id = ?;
