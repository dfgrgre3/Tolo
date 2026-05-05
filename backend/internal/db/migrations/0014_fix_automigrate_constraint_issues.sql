-- Migration: 0014_fix_automigrate_constraint_issues.sql
-- Purpose: Fix AutoMigrate constraint and column issues
-- Date: 2026-05-05
-- Description: Fixes UserSettings constraint and Category created_at column issues

BEGIN;

-- ============================================================
-- 1. Fix UserSettings constraint issue
-- ============================================================
-- The issue is that GORM expects a constraint named 'uni_UserSettings_user_id'
-- but it doesn't exist in the database. We need to create it first.
DO $$
BEGIN
    -- Check if the constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uni_UserSettings_user_id' 
        AND table_name = 'UserSettings'
    ) THEN
        -- Create the unique constraint that GORM expects
        ALTER TABLE "UserSettings" 
        ADD CONSTRAINT "uni_UserSettings_user_id" UNIQUE ("user_id");
        
        RAISE NOTICE 'Created uni_UserSettings_user_id constraint';
    ELSE
        RAISE NOTICE 'uni_UserSettings_user_id constraint already exists';
    END IF;
END $$;

-- ============================================================
-- 2. Fix Category created_at column issue
-- ============================================================
DO $$
BEGIN
    -- Check if created_at column exists in Category table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'created_at'
    ) THEN
        -- Add the missing created_at column
        ALTER TABLE "Category" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Added created_at column to Category table';
    ELSE
        RAISE NOTICE 'created_at column already exists in Category table';
    END IF;
    
    -- Also check for updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'updated_at'
    ) THEN
        -- Add the missing updated_at column
        ALTER TABLE "Category" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Added updated_at column to Category table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in Category table';
    END IF;
END $$;

-- ============================================================
-- 3. Update existing Category rows with created_at timestamps
-- ============================================================
DO $$
BEGIN
    -- Update any rows that have NULL created_at to use a reasonable default
    UPDATE "Category" 
    SET "created_at" = CURRENT_TIMESTAMP 
    WHERE "created_at" IS NULL;
    
    UPDATE "Category" 
    SET "updated_at" = CURRENT_TIMESTAMP 
    WHERE "updated_at" IS NULL;
    
    RAISE NOTICE 'Updated Category timestamps for existing rows';
END $$;

-- ============================================================
-- 4. Add indexes for Category timestamps if they don't exist
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_category_created_at ON "Category" ("created_at");
CREATE INDEX IF NOT EXISTS idx_category_updated_at ON "Category" ("updated_at");

COMMIT;

-- ============================================================
-- Post-migration notes:
-- ============================================================
-- This migration fixes the AutoMigrate issues by:
-- 1. Creating the expected UserSettings unique constraint
-- 2. Adding missing Category timestamp columns
-- 3. Updating existing data with appropriate timestamps
-- 4. Adding supporting indexes for better performance
