-- Add missing tables for Audit Logs and IP Whitelisting
CREATE TABLE IF NOT EXISTS public."AuditLog" (
    id uuid PRIMARY KEY,
    user_id uuid,
    event_type text NOT NULL,
    action text,
    resource text,
    resource_id text,
    changes text,
    metadata text,
    ip_address text,
    user_agent text,
    device_info text,
    location text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."ip_whitelist_settings" (
    id uuid PRIMARY KEY,
    is_enabled boolean DEFAULT false,
    enforce_for_admins boolean DEFAULT true,
    enforce_for_api boolean DEFAULT false,
    default_action text DEFAULT 'allow',
    allow_internal_ips boolean DEFAULT true,
    internal_ip_ranges text[],
    log_blocked_attempts boolean DEFAULT true,
    notify_on_violation boolean DEFAULT true,
    notify_email text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."ip_whitelist_entries" (
    id uuid PRIMARY KEY,
    ip_address text NOT NULL,
    cidr text,
    description text,
    type text NOT NULL,
    status text DEFAULT 'active',
    is_temporary boolean DEFAULT false,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."blocked_ip_attempts" (
    id uuid PRIMARY KEY,
    ip_address text NOT NULL,
    endpoint text,
    method text,
    user_agent text,
    location text,
    reason text,
    user_id uuid,
    count integer DEFAULT 1,
    attempted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."security_audit_logs" (
    id uuid PRIMARY KEY,
    event_type text NOT NULL,
    user_id uuid,
    ip_address text,
    user_agent text,
    details jsonb,
    severity text DEFAULT 'info',
    status text DEFAULT 'unread',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
