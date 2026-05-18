-- Migration 0028: Analytics Event Log for Event-Driven Analytics
-- Stores raw analytics events ingested from the frontend via Redis Stream.
-- Idempotency is enforced by the event_id unique constraint.
-- Data is inserted in batches by the analytics batch worker.

BEGIN;

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id"              TEXT NOT NULL UNIQUE,  -- client-generated idempotency key
    "event_type"            TEXT NOT NULL,
    "user_id"               TEXT,
    "payload"               JSONB NOT NULL DEFAULT '{}',
    "source"                TEXT DEFAULT 'frontend',
    "ip_address"            TEXT,
    "user_agent"            TEXT,
    "received_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "processed_at"          TIMESTAMPTZ,
    "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON "AnalyticsEvent" ("event_type");
CREATE INDEX IF NOT EXISTS idx_analytics_event_user ON "AnalyticsEvent" ("user_id");
CREATE INDEX IF NOT EXISTS idx_analytics_event_received ON "AnalyticsEvent" ("received_at" DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_unprocessed ON "AnalyticsEvent" ("processed_at")
    WHERE "processed_at" IS NULL;

COMMIT;
