-- Create UserSession table
CREATE TABLE IF NOT EXISTS public."UserSession" (
    id uuid NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    refresh_token text NOT NULL,
    user_agent text,
    ip text NOT NULL,
    location text,
    device_type text,
    status text DEFAULT 'active',
    is_active boolean DEFAULT true,
    last_accessed timestamptz,
    expires_at timestamptz,
    revoked_at timestamptz,
    revoked_by uuid,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_usersession_user_id ON public."UserSession" (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usersession_refresh_token ON public."UserSession" (refresh_token);
CREATE INDEX IF NOT EXISTS idx_usersession_is_active ON public."UserSession" (is_active);
CREATE INDEX IF NOT EXISTS idx_usersession_expires_at ON public."UserSession" (expires_at);
CREATE INDEX IF NOT EXISTS idx_usersession_deleted_at ON public."UserSession" (deleted_at);

-- Add foreign key
-- Note: Table "User" is quoted in baseline schema
ALTER TABLE public."UserSession" 
    ADD CONSTRAINT "fk_User_Sessions" 
    FOREIGN KEY (user_id) REFERENCES public."User"(id) 
    ON DELETE CASCADE;
