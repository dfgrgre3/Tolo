-- Fix UserSettings constraint issue
-- This script adds the constraint that GORM expects to find

-- Add the unique constraint that GORM is trying to drop
ALTER TABLE "UserSettings" 
ADD CONSTRAINT "uni_UserSettings_user_id" UNIQUE ("user_id");

-- Verify it was created
SELECT conname, contype 
FROM pg_constraint 
WHERE conname = 'uni_UserSettings_user_id';
