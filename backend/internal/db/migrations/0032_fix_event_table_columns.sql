-- Migration 0032: Fix Event table to match Go model expectations
-- The Go model (models/content.go) expects columns:
--   type, start_date, end_date, location, is_online, max_attendees, attendees_count, is_active
-- The baseline schema has Prisma camelCase column names (startDate, endDate, etc.)

BEGIN;

-- Add missing columns that the Go model requires
ALTER TABLE "Event"
    ADD COLUMN IF NOT EXISTS type text DEFAULT 'workshop',
    ADD COLUMN IF NOT EXISTS start_date timestamp with time zone,
    ADD COLUMN IF NOT EXISTS end_date timestamp with time zone,
    ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS attendees_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Populate start_date/end_date from existing camelCase columns
UPDATE "Event"
SET
    start_date = COALESCE(start_date, "startDate"::timestamp with time zone),
    end_date   = COALESCE(end_date, "endDate"::timestamp with time zone)
WHERE start_date IS NULL OR end_date IS NULL;

-- Index on is_active for efficient filtering
CREATE INDEX IF NOT EXISTS idx_event_is_active ON "Event" (is_active) WHERE deleted_at IS NULL;

COMMIT;
