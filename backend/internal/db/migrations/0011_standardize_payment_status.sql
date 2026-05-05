-- Migration: 0011_standardize_payment_status.sql
-- Purpose: Standardize Payment status values and fix ENUM issues
-- Date: 2026-05-05
-- Description: Converts status to standardized lowercase values
--              and creates lookup table for better management

BEGIN;

-- ============================================================
-- 1. Create Payment Status Lookup Table (replacing ENUM pattern)
-- ============================================================
CREATE TABLE IF NOT EXISTS "PaymentStatusLookup" (
    "code" VARCHAR(20) PRIMARY KEY,
    "label" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7) DEFAULT '#000000',
    "isActive" BOOLEAN DEFAULT TRUE,
    "sortOrder" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert standardized status values (lowercase for consistency)
INSERT INTO "PaymentStatusLookup" ("code", "label", "description", "color", "sortOrder") VALUES
    ('pending', 'Pending', 'Payment initiated but not completed', '#FFA500', 1),
    ('completed', 'Completed', 'Payment successfully processed', '#00AA00', 2),
    ('failed', 'Failed', 'Payment processing failed', '#FF0000', 3),
    ('refunded', 'Refunded', 'Payment has been refunded', '#808080', 4),
    ('cancelled', 'Cancelled', 'Payment was cancelled', '#808080', 5)
ON CONFLICT ("code") DO UPDATE SET
    "label" = EXCLUDED."label",
    "description" = EXCLUDED."description",
    "color" = EXCLUDED."color",
    "sortOrder" = EXCLUDED."sortOrder";

-- Ensure status is VARCHAR to handle standardized lowercase values and lookup table integration
DO $$
BEGIN
    -- Check if it's an enum or other user-defined type
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
        ALTER TABLE "Payment" ALTER COLUMN "status" TYPE VARCHAR(20) USING "status"::text;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND column_name = 'status') THEN
            UPDATE "Payment"
            SET "status" = LOWER("status"::text)
            WHERE "status" IS NOT NULL;

            -- Update specific mappings for legacy values
            UPDATE "Payment"
            SET "status" = 'completed'
            WHERE "status"::text IN ('paid', 'success', 'done', 'confirmed');

            UPDATE "Payment"
            SET "status" = 'failed'
            WHERE "status"::text IN ('error', 'declined', 'rejected');

            -- Ensure all records have valid status (default to pending if invalid)
            UPDATE "Payment"
            SET "status" = 'pending'
            WHERE "status"::text NOT IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')
               OR "status"::text IS NULL;
        END IF;
    END IF;
END $$;

-- ============================================================
-- 3. Drop and recreate partial indexes with correct values
-- ============================================================
DROP INDEX IF EXISTS idx_payment_completed_subject_user;

CREATE INDEX IF NOT EXISTS idx_payment_completed_subject_user 
ON "Payment" (user_id, subject_id, status) 
WHERE status = 'completed';

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_payment_pending_user 
ON "Payment" (user_id, created_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payment_failed_user 
ON "Payment" (user_id, created_at) 
WHERE status = 'failed';

-- ============================================================
-- 4. Add constraint to ensure status values are valid (optional FK)
-- ============================================================
-- Note: Uncomment if you want strict FK validation
-- ALTER TABLE "Payment" 
-- ADD CONSTRAINT fk_payment_status 
-- FOREIGN KEY ("status") REFERENCES "PaymentStatusLookup"("code");

-- For now, use a check constraint for validation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_status_valid') THEN
        ALTER TABLE "Payment" 
        ADD CONSTRAINT chk_payment_status_valid 
        CHECK ("status" IN ('pending', 'completed', 'failed', 'refunded', 'cancelled'));
    END IF;
END $$;

-- ============================================================
-- 5. Standardize other status columns across the database
-- ============================================================

-- UserSubscription status (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserSubscription') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserSubscription' AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
            ALTER TABLE "UserSubscription" ALTER COLUMN "status" TYPE VARCHAR(20) USING "status"::text;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserSubscription') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserSubscription' AND column_name = 'status') THEN
            UPDATE "UserSubscription"
            SET "status" = UPPER("status"::text)
            WHERE "status" IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Enrollment status (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SubjectEnrollment') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SubjectEnrollment' AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
            ALTER TABLE "SubjectEnrollment" ALTER COLUMN "status" TYPE VARCHAR(20) USING "status"::text;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SubjectEnrollment') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SubjectEnrollment' AND column_name = 'status') THEN
            UPDATE "SubjectEnrollment"
            SET "status" = LOWER("status"::text)
            WHERE "status" IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Notification status (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Notification') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'status' AND data_type = 'USER-DEFINED') THEN
            ALTER TABLE "Notification" ALTER COLUMN "status" TYPE VARCHAR(20) USING "status"::text;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Notification') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'status') THEN
            UPDATE "Notification"
            SET "status" = LOWER("status"::text)
            WHERE "status" IS NOT NULL;
        END IF;
    END IF;
END $$;

COMMIT;
