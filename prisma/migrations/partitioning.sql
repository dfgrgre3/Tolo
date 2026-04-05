-- Partitioning Migration for Thannawy (10M+ Users)
-- Target Table: Notification
-- Strategy: Partition by Range (Month)

-- 1. Create the partitioned table structure
CREATE TABLE "Notification_Partitioned" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_Partitioned_pkey" PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- 2. Create initial partitions for 2024-2025
CREATE TABLE "Notification_2024_Q4" PARTITION OF "Notification_Partitioned"
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

CREATE TABLE "Notification_2025_Q1" PARTITION OF "Notification_Partitioned"
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE "Notification_2025_Q2" PARTITION OF "Notification_Partitioned"
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- 3. Migration: Copy data from old table to new (Optional: Batch this in production!)
-- INSERT INTO "Notification_Partitioned" SELECT * FROM "Notification";

-- 4. Swap tables
-- ALTER TABLE "Notification" RENAME TO "Notification_Old";
-- ALTER TABLE "Notification_Partitioned" RENAME TO "Notification";

-- 5. Re-create Indexes on the parent table (will propagated to partitions)
CREATE INDEX "Notification_userId_idx" ON "Notification" ("userId");
CREATE INDEX "Notification_isDeleted_createdAt_idx" ON "Notification" ("isDeleted", "createdAt" DESC);
