-- DropIndex
DROP INDEX "StudySession_isDeleted_idx";

-- DropIndex
DROP INDEX "StudySession_startTime_idx";

-- DropIndex
DROP INDEX "StudySession_subjectId_idx";

-- DropIndex
DROP INDEX "StudySession_userId_startTime_idx";

-- DropIndex
DROP INDEX "StudySession_userId_subjectId_idx";

-- DropIndex
DROP INDEX "User_isDeleted_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- DropIndex
DROP INDEX "UserXP_totalXP_idx";

-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "StudySession_userId_isDeleted_idx" ON "StudySession"("userId", "isDeleted");

-- CreateIndex
CREATE INDEX "StudySession_subjectId_isDeleted_idx" ON "StudySession"("subjectId", "isDeleted");

-- CreateIndex
CREATE INDEX "StudySession_status_startTime_idx" ON "StudySession"("status", "startTime" DESC);

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_isDeleted_role_idx" ON "User"("isDeleted", "role");

-- CreateIndex
CREATE INDEX "UserXP_totalXP_level_idx" ON "UserXP"("totalXP" DESC, "level");
