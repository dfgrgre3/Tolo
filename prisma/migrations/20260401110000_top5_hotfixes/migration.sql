-- Drop the incorrect unique constraint that allowed only one active schedule per user.
DROP INDEX IF EXISTS "userId_active";

-- Support cursor-based pagination for notifications and schedules.
CREATE INDEX IF NOT EXISTS "Notification_userId_isDeleted_isRead_createdAt_id_idx"
ON "Notification"("userId", "isDeleted", "isRead", "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Schedule_userId_active_startTime_idx"
ON "Schedule"("userId", "active", "startTime");

-- Support bidirectional chat pagination on large conversations.
CREATE INDEX IF NOT EXISTS "Message_senderId_receiverId_createdAt_id_idx"
ON "Message"("senderId", "receiverId", "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Message_receiverId_senderId_createdAt_id_idx"
ON "Message"("receiverId", "senderId", "createdAt" DESC, "id" DESC);

-- FIX: Partial Unique Index for SubjectEnrollment to allow re-enrollment after soft-delete
-- We first drop the standard unique index created by Prisma
DROP INDEX IF EXISTS "SubjectEnrollment_userId_subjectId_key";
CREATE UNIQUE INDEX "SubjectEnrollment_active_enrollment_idx" 
ON "SubjectEnrollment" ("userId", "subjectId") 
WHERE "isDeleted" = false;

-- OPTIMIZATION: Index for unread notifications count query
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_isDeleted_idx"
ON "Notification"("userId", "isRead", "isDeleted")
WHERE "isRead" = false AND "isDeleted" = false;
