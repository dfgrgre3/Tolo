-- Fix missing deleted_at column on User table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'deleted_at') THEN
        ALTER TABLE "User" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "User" ("deleted_at");
    END IF;
END
$$;
