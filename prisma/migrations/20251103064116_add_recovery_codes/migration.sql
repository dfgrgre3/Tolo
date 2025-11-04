/*
  Warnings:

  - You are about to drop the `Curriculum` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExamResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GradeLevel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OfflineLesson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Schedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubTopic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Teacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Topic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `earnedAt` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Exam` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `SubjectEnrollment` table. All the data in the column will be lost.
  - You are about to alter the column `biometricCredentials` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `biometricEnabled` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `twoFactorEnabled` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - Added the required column `category` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `difficulty` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `icon` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requirements` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `xpReward` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Achievement` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `subject` to the `SubjectEnrollment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Curriculum_gradeLevelId_id_idx";

-- DropIndex
DROP INDEX "Curriculum_gradeLevelId_subject_id_idx";

-- DropIndex
DROP INDEX "Curriculum_gradeLevelId_subject_createdAt_idx";

-- DropIndex
DROP INDEX "Curriculum_gradeLevelId_subject_idx";

-- DropIndex
DROP INDEX "Curriculum_subject_gradeLevelId_idx";

-- DropIndex
DROP INDEX "Curriculum_subject_idx";

-- DropIndex
DROP INDEX "Curriculum_gradeLevelId_idx";

-- DropIndex
DROP INDEX "ExamResult_examId_idx";

-- DropIndex
DROP INDEX "ExamResult_userId_takenAt_idx";

-- DropIndex
DROP INDEX "ExamResult_userId_examId_idx";

-- DropIndex
DROP INDEX "GradeLevel_educationSystem_id_idx";

-- DropIndex
DROP INDEX "GradeLevel_educationSystem_level_id_idx";

-- DropIndex
DROP INDEX "GradeLevel_educationSystem_level_idx";

-- DropIndex
DROP INDEX "GradeLevel_level_educationSystem_idx";

-- DropIndex
DROP INDEX "GradeLevel_educationSystem_idx";

-- DropIndex
DROP INDEX "GradeLevel_level_idx";

-- DropIndex
DROP INDEX "GradeLevel_nameAr_key";

-- DropIndex
DROP INDEX "GradeLevel_name_key";

-- DropIndex
DROP INDEX "OfflineLesson_userId_startTime_idx";

-- DropIndex
DROP INDEX "OfflineLesson_userId_teacherId_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_userId_streakDays_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_userId_date_streakDays_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_userId_averageFocusScore_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_userId_totalStudyMinutes_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_gradeAverage_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_completedTasks_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_averageFocusScore_idx";

-- DropIndex
DROP INDEX "ProgressSnapshot_totalStudyMinutes_idx";

-- DropIndex
DROP INDEX "Recommendation_userId_createdAt_idx";

-- DropIndex
DROP INDEX "Reminder_userId_remindAt_idx";

-- DropIndex
DROP INDEX "Reminder_createdAt_idx";

-- DropIndex
DROP INDEX "Reminder_remindAt_idx";

-- DropIndex
DROP INDEX "Reminder_userId_idx";

-- DropIndex
DROP INDEX "Resource_subject_type_free_idx";

-- DropIndex
DROP INDEX "Resource_subject_idx";

-- DropIndex
DROP INDEX "Resource_type_idx";

-- DropIndex
DROP INDEX "Resource_subject_type_idx";

-- DropIndex
DROP INDEX "Schedule_userId_active_idx";

-- DropIndex
DROP INDEX "Schedule_userId_active_createdAt_idx";

-- DropIndex
DROP INDEX "SecurityLog_eventType_createdAt_idx";

-- DropIndex
DROP INDEX "SecurityLog_userId_eventType_createdAt_idx";

-- DropIndex
DROP INDEX "Session_isActive_expiresAt_idx";

-- DropIndex
DROP INDEX "Session_userId_isActive_expiresAt_idx";

-- DropIndex
DROP INDEX "StudySession_startTime_endTime_idx";

-- DropIndex
DROP INDEX "StudySession_userId_subject_startTime_idx";

-- DropIndex
DROP INDEX "StudySession_date_idx";

-- DropIndex
DROP INDEX "StudySession_userId_durationMin_idx";

-- DropIndex
DROP INDEX "StudySession_userId_endTime_idx";

-- DropIndex
DROP INDEX "StudySession_focusScore_idx";

-- DropIndex
DROP INDEX "StudySession_durationMin_idx";

-- DropIndex
DROP INDEX "StudySession_endTime_idx";

-- DropIndex
DROP INDEX "StudySession_userId_startTime_idx";

-- DropIndex
DROP INDEX "StudySession_subject_idx";

-- DropIndex
DROP INDEX "StudySession_userId_idx";

-- DropIndex
DROP INDEX "SubTopic_topicId_id_idx";

-- DropIndex
DROP INDEX "SubTopic_topicId_order_id_idx";

-- DropIndex
DROP INDEX "SubTopic_topicId_order_idx";

-- DropIndex
DROP INDEX "SubTopic_isActive_idx";

-- DropIndex
DROP INDEX "SubTopic_order_idx";

-- DropIndex
DROP INDEX "SubTopic_topicId_idx";

-- DropIndex
DROP INDEX "SubTopic_nameAr_key";

-- DropIndex
DROP INDEX "SubTopic_name_key";

-- DropIndex
DROP INDEX "Subject_code_id_idx";

-- DropIndex
DROP INDEX "Subject_code_isActive_id_idx";

-- DropIndex
DROP INDEX "Subject_code_isActive_idx";

-- DropIndex
DROP INDEX "Subject_isActive_idx";

-- DropIndex
DROP INDEX "Subject_code_idx";

-- DropIndex
DROP INDEX "Subject_code_key";

-- DropIndex
DROP INDEX "Subject_nameAr_key";

-- DropIndex
DROP INDEX "Subject_name_key";

-- DropIndex
DROP INDEX "Task_userId_priority_createdAt_idx";

-- DropIndex
DROP INDEX "Task_status_dueAt_idx";

-- DropIndex
DROP INDEX "Task_userId_subject_createdAt_idx";

-- DropIndex
DROP INDEX "Task_userId_status_createdAt_idx";

-- DropIndex
DROP INDEX "Task_userId_status_dueAt_idx";

-- DropIndex
DROP INDEX "Task_subject_idx";

-- DropIndex
DROP INDEX "Task_userId_dueAt_idx";

-- DropIndex
DROP INDEX "Task_userId_priority_idx";

-- DropIndex
DROP INDEX "Task_priority_idx";

-- DropIndex
DROP INDEX "Task_updatedAt_idx";

-- DropIndex
DROP INDEX "Task_createdAt_idx";

-- DropIndex
DROP INDEX "Task_userId_status_idx";

-- DropIndex
DROP INDEX "Task_dueAt_idx";

-- DropIndex
DROP INDEX "Task_status_idx";

-- DropIndex
DROP INDEX "Task_userId_idx";

-- DropIndex
DROP INDEX "Teacher_subject_idx";

-- DropIndex
DROP INDEX "Topic_subjectId_id_idx";

-- DropIndex
DROP INDEX "Topic_subjectId_gradeLevelId_curriculumId_order_idx";

-- DropIndex
DROP INDEX "Topic_curriculumId_order_idx";

-- DropIndex
DROP INDEX "Topic_subjectId_gradeLevelId_order_idx";

-- DropIndex
DROP INDEX "Topic_subjectId_gradeLevelId_idx";

-- DropIndex
DROP INDEX "Topic_order_idx";

-- DropIndex
DROP INDEX "Topic_isActive_idx";

-- DropIndex
DROP INDEX "Topic_gradeLevelId_idx";

-- DropIndex
DROP INDEX "Topic_curriculumId_idx";

-- DropIndex
DROP INDEX "Topic_subjectId_idx";

-- DropIndex
DROP INDEX "Topic_nameAr_key";

-- DropIndex
DROP INDEX "Topic_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Curriculum";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExamResult";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GradeLevel";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OfflineLesson";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Recommendation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Schedule";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SubTopic";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Subject";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Teacher";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Topic";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAchievement_achievementKey_fkey" FOREIGN KEY ("achievementKey") REFERENCES "Achievement" ("key") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" REAL NOT NULL,
    "currentValue" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "CustomGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TwoFactorChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BiometricChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challenge" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "requirements" JSONB NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Achievement" ("description", "id", "key", "title") SELECT "description", "id", "key", "title" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");
CREATE INDEX "Achievement_difficulty_idx" ON "Achievement"("difficulty");
CREATE TABLE "new_Exam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "url" TEXT NOT NULL
);
INSERT INTO "new_Exam" ("id", "subject", "title", "url", "year") SELECT "id", "subject", "title", "url", "year" FROM "Exam";
DROP TABLE "Exam";
ALTER TABLE "new_Exam" RENAME TO "Exam";
CREATE TABLE "new_SubjectEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "targetWeeklyHours" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubjectEnrollment" ("createdAt", "id", "targetWeeklyHours", "userId") SELECT "createdAt", "id", "targetWeeklyHours", "userId" FROM "SubjectEnrollment";
DROP TABLE "SubjectEnrollment";
ALTER TABLE "new_SubjectEnrollment" RENAME TO "SubjectEnrollment";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "avatar" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "wakeUpTime" TEXT,
    "sleepTime" TEXT,
    "focusStrategy" TEXT DEFAULT 'POMODORO',
    "emailNotifications" BOOLEAN DEFAULT true,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" DATETIME,
    "emailVerified" BOOLEAN DEFAULT false,
    "lastLogin" DATETIME,
    "phone" TEXT,
    "refreshToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpires" DATETIME,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "recoveryCodes" TEXT,
    "smsNotifications" BOOLEAN DEFAULT false,
    "biometricEnabled" BOOLEAN NOT NULL DEFAULT false,
    "biometricCredentials" JSONB NOT NULL DEFAULT [],
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalStudyTime" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "examsPassed" INTEGER NOT NULL DEFAULT 0,
    "pomodoroSessions" INTEGER NOT NULL DEFAULT 0,
    "deepWorkSessions" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("biometricCredentials", "biometricEnabled", "createdAt", "email", "emailNotifications", "emailVerificationExpires", "emailVerificationToken", "emailVerified", "focusStrategy", "id", "lastLogin", "name", "passwordHash", "phone", "recoveryCodes", "refreshToken", "resetToken", "resetTokenExpires", "sleepTime", "smsNotifications", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "wakeUpTime") SELECT CASE WHEN typeof("biometricCredentials") = 'text' THEN "biometricCredentials" ELSE json('[]') END AS "biometricCredentials", CASE WHEN typeof("biometricEnabled") = 'integer' THEN CAST("biometricEnabled" AS BOOLEAN) ELSE COALESCE("biometricEnabled", 0) END AS "biometricEnabled", "createdAt", "email", "emailNotifications", "emailVerificationExpires", "emailVerificationToken", "emailVerified", "focusStrategy", "id", "lastLogin", "name", "passwordHash", "phone", COALESCE("recoveryCodes", NULL) AS "recoveryCodes", "refreshToken", "resetToken", "resetTokenExpires", "sleepTime", "smsNotifications", CASE WHEN typeof("twoFactorEnabled") = 'integer' THEN CAST("twoFactorEnabled" AS BOOLEAN) ELSE COALESCE("twoFactorEnabled", 0) END AS "twoFactorEnabled", "twoFactorSecret", "updatedAt", "wakeUpTime" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementKey_idx" ON "UserAchievement"("achievementKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementKey_key" ON "UserAchievement"("userId", "achievementKey");

-- CreateIndex
CREATE INDEX "CustomGoal_userId_idx" ON "CustomGoal"("userId");

-- CreateIndex
CREATE INDEX "CustomGoal_category_idx" ON "CustomGoal"("category");

-- CreateIndex
CREATE INDEX "CustomGoal_isCompleted_idx" ON "CustomGoal"("isCompleted");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_expiresAt_idx" ON "TwoFactorChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_userId_idx" ON "TwoFactorChallenge"("userId");

-- CreateIndex
CREATE INDEX "BiometricChallenge_expiresAt_idx" ON "BiometricChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "BiometricChallenge_type_idx" ON "BiometricChallenge"("type");

-- CreateIndex
CREATE INDEX "BiometricChallenge_userId_idx" ON "BiometricChallenge"("userId");
