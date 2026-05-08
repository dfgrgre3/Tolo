-- Migration: 0022_fix_notification_table.sql
-- Description: Add missing columns and fix naming inconsistencies in Notification table

-- 1. Add missing columns
ALTER TABLE public."Notification" 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'GENERAL',
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS channels jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS broadcast_id uuid,
ADD COLUMN IF NOT EXISTS actions jsonb DEFAULT '[]';

-- 2. Rename columns to match Go model (snake_case)
DO $$ 
DECLARE
    tbl_name text := 'Notification';
BEGIN 
    -- isRead -> is_read
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'isRead') THEN
        ALTER TABLE public."Notification" RENAME COLUMN "isRead" TO is_read;
    END IF;
    
    -- isDeleted -> is_deleted
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'isDeleted') THEN
        ALTER TABLE public."Notification" RENAME COLUMN "isDeleted" TO is_deleted;
    END IF;

    -- actionUrl -> action_url (though Go model ignores it, good for consistency)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'actionUrl') THEN
        ALTER TABLE public."Notification" RENAME COLUMN "actionUrl" TO action_url;
    END IF;

    -- deletedAt -> deleted_at_extra (Notification already has deleted_at)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'deletedAt') THEN
        ALTER TABLE public."Notification" RENAME COLUMN "deletedAt" TO deleted_at_extra;
    END IF;
END $$;

-- 3. Add indexes for new columns if needed
CREATE INDEX IF NOT EXISTS idx_notification_category ON public."Notification"(category);
CREATE INDEX IF NOT EXISTS idx_notification_status ON public."Notification"(status);
CREATE INDEX IF NOT EXISTS idx_notification_is_read ON public."Notification"(is_read);
