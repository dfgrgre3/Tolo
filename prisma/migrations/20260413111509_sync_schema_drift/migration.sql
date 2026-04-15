/*
  Warnings:

  - A unique constraint covering the columns `[userId,subjectId]` on the table `SubjectEnrollment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- DropIndex
DROP INDEX "Subject_categoryId_idx";

-- DropIndex
DROP INDEX "Subject_enrolledCount_idx";

-- DropIndex
DROP INDEX "Subject_instructorName_idx";

-- DropIndex
DROP INDEX "Subject_isActive_createdAt_idx";

-- DropIndex
DROP INDEX "Subject_rating_idx";

-- DropIndex
DROP INDEX "User_emailVerificationToken_idx";

-- DropIndex
DROP INDEX "User_emailVerified_idx";

-- DropIndex
DROP INDEX "User_isDeleted_role_idx";

-- DropIndex
DROP INDEX "User_lastLogin_idx";

-- DropIndex
DROP INDEX "User_magicLinkToken_idx";

-- DropIndex
DROP INDEX "User_name_idx";

-- DropIndex
DROP INDEX "User_phoneVerificationOTP_idx";

-- DropIndex
DROP INDEX "User_referralCode_idx";

-- DropIndex
DROP INDEX "User_resetToken_idx";

-- DropIndex
DROP INDEX "User_role_status_idx";

-- DropIndex
DROP INDEX "User_username_idx";

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "completionRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "coursePrerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT DEFAULT 'ar',
ADD COLUMN     "lastContentUpdate" TIMESTAMP(3),
ADD COLUMN     "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "videoCount" INTEGER DEFAULT 0,
ADD COLUMN     "whatYouLearn" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "SubjectEnrollment" ADD COLUMN     "completedLessonsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastUsageReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthlyAiMessageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "monthlyExamCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Subject_categoryId_isActive_idx" ON "Subject"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "Subject_isActive_level_createdAt_idx" ON "Subject"("isActive", "level", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Subject_isActive_enrolledCount_idx" ON "Subject"("isActive", "enrolledCount" DESC);

-- CreateIndex
CREATE INDEX "Subject_isActive_rating_idx" ON "Subject"("isActive", "rating" DESC);

-- CreateIndex
CREATE INDEX "Subject_isActive_price_id_idx" ON "Subject"("isActive", "price", "id");

-- CreateIndex
CREATE INDEX "Subject_isFeatured_isActive_idx" ON "Subject"("isFeatured", "isActive");

-- CreateIndex
CREATE INDEX "subject_name_trgm_idx" ON "Subject" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "subject_name_ar_trgm_idx" ON "Subject" USING GIN ("nameAr" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "subject_description_trgm_idx" ON "Subject" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "subject_slug_trgm_idx" ON "Subject" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectEnrollment_userId_subjectId_key" ON "SubjectEnrollment"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "user_name_trgm_idx" ON "User" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "user_username_trgm_idx" ON "User" USING GIN ("username" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "user_email_trgm_idx" ON "User" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_isDeleted_status_role_idx" ON "User"("isDeleted", "status", "role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
