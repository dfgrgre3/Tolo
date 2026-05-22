-- Create optimized index for resource filtering and counting
CREATE INDEX IF NOT EXISTS idx_resource_free_filtering ON "Resource" (free, subject_id, type) WHERE deleted_at IS NULL;

-- Fast index for count queries on free + deleted_at (critical for /api/resources)
CREATE INDEX IF NOT EXISTS idx_resource_free_deleted ON "Resource" (free, deleted_at);