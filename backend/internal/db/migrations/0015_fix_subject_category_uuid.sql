-- Migration: 0015_fix_subject_category_uuid.sql
-- Purpose: Fix invalid category_id UUID values in Subject table
-- Date: 2026-05-05
-- Description: Converts invalid category_id values to NULL or valid UUIDs

BEGIN;

-- ============================================================
-- 1. First, let's identify the problematic category_id values
-- ============================================================
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Count rows with invalid UUID format in category_id
    SELECT COUNT(*) INTO invalid_count
    FROM "Subject" 
    WHERE category_id IS NOT NULL 
    AND category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND category_id !~ '^[0-9a-f]{8}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{12}$'; -- also check without dashes
    
    RAISE NOTICE 'Found % rows with invalid category_id UUID format', invalid_count;
    
    -- Show some examples of invalid values for debugging
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Sample invalid category_id values:';
        EXECUTE '
            SELECT category_id, COUNT(*) as count
            FROM "Subject" 
            WHERE category_id IS NOT NULL 
            AND category_id !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
            AND category_id !~ ''^[0-9a-f]{8}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{12}$''
            GROUP BY category_id
            LIMIT 5
        ';
    END IF;
END $$;

-- ============================================================
-- 2. Create a backup of the problematic data
-- ============================================================
CREATE TABLE IF NOT EXISTS "Subject_category_id_backup" AS
SELECT id, name, category_id as original_category_id, CURRENT_TIMESTAMP as backup_timestamp
FROM "Subject" 
WHERE category_id IS NOT NULL 
AND category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND category_id !~ '^[0-9a-f]{8}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{12}$';

DO $$
BEGIN
    RAISE NOTICE 'Created backup table with % rows', (SELECT COUNT(*) FROM "Subject_category_id_backup");
END $$;

-- ============================================================
-- 3. Try to convert invalid values to valid UUIDs if possible
-- ============================================================
DO $$
DECLARE
    subject_record RECORD;
    converted_count INTEGER := 0;
    nullified_count INTEGER := 0;
BEGIN
    -- Process each subject with invalid category_id
    FOR subject_record IN 
        SELECT id, category_id, name
        FROM "Subject" 
        WHERE category_id IS NOT NULL 
        AND category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND category_id !~ '^[0-9a-f]{8}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{4}[0-9a-f]{12}$'
    LOOP
        BEGIN
            -- Try to convert the value to a proper UUID format
            -- Handle the case where it might be a 32-character hex string without dashes
            IF LENGTH(subject_record.category_id) = 32 AND subject_record.category_id ~ '^[0-9a-f]{32}$' THEN
                -- Convert 32-char hex to proper UUID format
                UPDATE "Subject" 
                SET category_id = SUBSTRING(subject_record.category_id, 1, 8) || '-' ||
                               SUBSTRING(subject_record.category_id, 9, 4) || '-' ||
                               SUBSTRING(subject_record.category_id, 13, 4) || '-' ||
                               SUBSTRING(subject_record.category_id, 17, 4) || '-' ||
                               SUBSTRING(subject_record.category_id, 21, 12)
                WHERE id = subject_record.id;
                converted_count := converted_count + 1;
            ELSE
                -- For other invalid formats, set to NULL
                UPDATE "Subject" 
                SET category_id = NULL
                WHERE id = subject_record.id;
                nullified_count := nullified_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- If conversion fails, set to NULL
            UPDATE "Subject" 
            SET category_id = NULL
            WHERE id = subject_record.id;
            nullified_count := nullified_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE 'Converted % invalid category_id values to proper UUID format', converted_count;
    RAISE NOTICE 'Set % invalid category_id values to NULL', nullified_count;
END $$;

-- ============================================================
-- 4. Verify the fix
-- ============================================================
DO $$
DECLARE
    remaining_invalid INTEGER;
BEGIN
    -- Check if there are still invalid UUID values
    SELECT COUNT(*) INTO remaining_invalid
    FROM "Subject" 
    WHERE category_id IS NOT NULL 
    AND category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    IF remaining_invalid = 0 THEN
        RAISE NOTICE 'SUCCESS: All category_id values are now valid UUIDs or NULL';
    ELSE
        RAISE NOTICE 'WARNING: % rows still have invalid category_id values', remaining_invalid;
    END IF;
END $$;

-- ============================================================
-- 5. Add a check constraint to prevent future invalid UUIDs
-- ============================================================
DO $$
BEGIN
    -- Add check constraint for valid UUID format
    ALTER TABLE "Subject" 
    ADD CONSTRAINT "subject_category_id_uuid_check" 
    CHECK (category_id IS NULL OR category_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    
    RAISE NOTICE 'Added UUID format check constraint to Subject.category_id';
EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'UUID check constraint already exists on Subject.category_id';
END $$;

COMMIT;

-- ============================================================
-- Post-migration notes:
-- ============================================================
-- This migration fixes the AutoMigrate UUID conversion issue by:
-- 1. Identifying all invalid category_id values
-- 2. Creating a backup of the original data
-- 3. Converting 32-char hex strings to proper UUID format where possible
-- 4. Setting clearly invalid values to NULL
-- 5. Adding a check constraint to prevent future invalid UUIDs
-- 
-- After this migration, the Subject table should be ready for AutoMigrate
-- to properly convert the category_id column to UUID type.
