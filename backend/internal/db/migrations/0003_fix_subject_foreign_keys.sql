-- Migration: 0003_fix_subject_foreign_keys.sql
-- Purpose: Fix foreign key constraints for Subject references to allow proper deletion
-- Date: 2026-05-02

-- Drop existing foreign key constraints that block subject deletion
-- Note: PostgreSQL requires dropping constraints before recreating them

-- 1. StudySession - Change to SET NULL
ALTER TABLE "StudySession" DROP CONSTRAINT IF EXISTS "StudySession_subjectId_fkey";
ALTER TABLE "StudySession" ALTER COLUMN "subjectId" DROP NOT NULL;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_subjectId_fkey" 
    FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;

-- 2. LiveEvent - Change to SET NULL (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'LiveEvent') THEN
        ALTER TABLE "LiveEvent" DROP CONSTRAINT IF EXISTS "LiveEvent_subjectId_fkey";
        ALTER TABLE "LiveEvent" ALTER COLUMN "subjectId" DROP NOT NULL;
        ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_subjectId_fkey" 
            FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Book - Change to SET NULL
ALTER TABLE "Book" DROP CONSTRAINT IF EXISTS "Book_subjectId_fkey";
ALTER TABLE "Book" ALTER COLUMN "subjectId" DROP NOT NULL;
ALTER TABLE "Book" ADD CONSTRAINT "Book_subjectId_fkey" 
    FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;

-- 4. Challenge - Change to SET NULL (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Challenge') THEN
        ALTER TABLE "Challenge" DROP CONSTRAINT IF EXISTS "Challenge_subjectId_fkey";
        ALTER TABLE "Challenge" ALTER COLUMN "subjectId" DROP NOT NULL;
        ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_subjectId_fkey" 
            FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Payment - Change to SET NULL
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_subjectId_fkey";
ALTER TABLE "Payment" ALTER COLUMN "subjectId" DROP NOT NULL;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subjectId_fkey" 
    FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;

-- Add indexes for better query performance on nullable columns
CREATE INDEX IF NOT EXISTS "idx_study_session_subject" ON "StudySession"("subjectId");
CREATE INDEX IF NOT EXISTS "idx_book_subject" ON "Book"("subjectId");
CREATE INDEX IF NOT EXISTS "idx_payment_subject" ON "Payment"("subjectId");
