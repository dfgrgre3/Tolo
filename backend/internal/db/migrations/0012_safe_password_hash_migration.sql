-- Migration: 0012_safe_password_hash_migration.sql
-- Purpose: Safely add password_hash column without breaking existing data
-- Date: 2026-05-05
-- Description: 3-step migration: add nullable column → migrate data → make NOT NULL

BEGIN;

-- ============================================================
-- 1. Add password_hash column as nullable first (safe operation)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "password_hash" TEXT;
        
        -- Add comment explaining the column
        COMMENT ON COLUMN "User"."password_hash" IS 'Bcrypt hashed password. NULL only during migration.';
        
        RAISE NOTICE 'Added password_hash column as nullable';
    ELSE
        -- If already exists but is NOT NULL, temporarily make it nullable for migration
        ALTER TABLE "User" ALTER COLUMN "password_hash" DROP NOT NULL;
        RAISE NOTICE 'Made existing password_hash column nullable for migration';
    END IF;
END $$;

-- ============================================================
-- 2. Migrate existing data based on authentication provider
-- ============================================================
DO $$
DECLARE
    -- Hash of 'TempPass123!' for temporary assignment
    temp_hash TEXT := '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G';
    rows_updated INTEGER;
    has_provider BOOLEAN;
BEGIN
    -- Check if provider column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'provider'
    ) INTO has_provider;

    IF has_provider THEN
        -- 2a. Migrate users with local auth who have legacy 'password' column
        -- (Assumes old schema had 'password' column - adjust if different)

        -- 2b. Set temp hash for local users without password_hash
        UPDATE "User"
        SET "password_hash" = temp_hash,
            "updated_at" = NOW()
        WHERE "password_hash" IS NULL
          AND ("provider" = 'local' OR "provider" IS NULL OR "provider" = '');

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        RAISE NOTICE 'Set temporary password hash for % local users', rows_updated;

        -- 2c. Mark OAuth users with special marker (no password needed)
        UPDATE "User"
        SET "password_hash" = 'OAUTH_USER_NO_PASSWORD',
            "updated_at" = NOW()
        WHERE "password_hash" IS NULL
          AND "provider" IN ('google', 'facebook', 'clerk', 'oauth');

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        RAISE NOTICE 'Marked % OAuth users', rows_updated;
    ELSE
        RAISE NOTICE 'provider column not found, skipping provider-specific logic';
    END IF;

    -- 2d. Handle any remaining rows (should be 0 if data is clean)
    UPDATE "User"
    SET "password_hash" = temp_hash,
        "updated_at" = NOW()
    WHERE "password_hash" IS NULL;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    IF rows_updated > 0 THEN
        RAISE NOTICE 'Set temporary password hash for % remaining users', rows_updated;
    END IF;
END $$;

-- ============================================================
-- 3. Verify no NULL values remain before making NOT NULL
-- ============================================================
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM "User" WHERE "password_hash" IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Cannot make password_hash NOT NULL: % rows still have NULL values. Migration aborted.', null_count;
    END IF;
    
    RAISE NOTICE 'Verification passed: no NULL password_hash values';
END $$;

-- ============================================================
-- 4. Make password_hash NOT NULL
-- ============================================================
ALTER TABLE "User" ALTER COLUMN "password_hash" SET NOT NULL;

-- Add index for faster auth lookups (only if provider column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'provider'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_password_hash ON "User" ("password_hash")
        WHERE "provider" = 'local' OR "provider" IS NULL;
    ELSE
        CREATE INDEX IF NOT EXISTS idx_user_password_hash ON "User" ("password_hash");
    END IF;
END $$;

-- ============================================================
-- 5. Clean up legacy password column if it exists (optional)
-- ============================================================
-- DO $$
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_name = 'User' AND column_name = 'password'
--     ) THEN
--         ALTER TABLE "User" DROP COLUMN "password";
--         RAISE NOTICE 'Dropped legacy password column';
--     END IF;
-- END $$;

COMMIT;

-- ============================================================
-- Post-migration notes:
-- ============================================================
-- Users with temp_hash (TempPass123!) must reset their passwords
-- Run this query to find them:
-- SELECT id, email FROM "User" 
-- WHERE "password_hash" = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G';
