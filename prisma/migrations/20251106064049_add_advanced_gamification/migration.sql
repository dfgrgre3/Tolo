-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rewards" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeasonParticipation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonXP" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL,
    CONSTRAINT "SeasonParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonParticipation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "requirements" JSONB NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subject" TEXT,
    "levelRange" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChallengeCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" REAL NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChallengeCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChallengeCompletion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestChain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "totalQuests" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chainId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "requirements" JSONB NOT NULL,
    "prerequisites" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quest_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "QuestChain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "progress" REAL NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestProgress_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "QuestChain" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "isTradeable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserReward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "nftTokenId" TEXT,
    CONSTRAINT "UserReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserReward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT,
    "subject" TEXT,
    "levelRange" TEXT,
    "seasonId" TEXT,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "studyXP" INTEGER NOT NULL DEFAULT 0,
    "taskXP" INTEGER NOT NULL DEFAULT 0,
    "examXP" INTEGER NOT NULL DEFAULT 0,
    "challengeXP" INTEGER NOT NULL DEFAULT 0,
    "questXP" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" DATETIME NOT NULL,
    CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaderboardEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables

CREATE TABLE "new_Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "xpReward" INTEGER NOT NULL,
    "requirements" JSONB NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "unlockedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Achievement" ("category", "createdAt", "description", "difficulty", "icon", "id", "isSecret", "key", "requirements", "title", "xpReward") SELECT "category", "createdAt", "description", "difficulty", "icon", "id", "isSecret", "key", "requirements", "title", "xpReward" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");
CREATE INDEX "Achievement_category_idx" ON "Achievement"("category");
CREATE INDEX "Achievement_difficulty_idx" ON "Achievement"("difficulty");
CREATE INDEX "Achievement_rarity_idx" ON "Achievement"("rarity");
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
    "deepWorkSessions" INTEGER NOT NULL DEFAULT 0,
    "studyXP" INTEGER NOT NULL DEFAULT 0,
    "taskXP" INTEGER NOT NULL DEFAULT 0,
    "examXP" INTEGER NOT NULL DEFAULT 0,
    "challengeXP" INTEGER NOT NULL DEFAULT 0,
    "questXP" INTEGER NOT NULL DEFAULT 0,
    "seasonXP" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("avatar", "biometricCredentials", "biometricEnabled", "createdAt", "currentStreak", "deepWorkSessions", "email", "emailNotifications", "emailVerificationExpires", "emailVerificationToken", "emailVerified", "examsPassed", "focusStrategy", "id", "lastLogin", "level", "longestStreak", "name", "passwordHash", "phone", "pomodoroSessions", "recoveryCodes", "refreshToken", "resetToken", "resetTokenExpires", "sleepTime", "smsNotifications", "tasksCompleted", "totalStudyTime", "totalXP", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "username", "wakeUpTime") SELECT "avatar", "biometricCredentials", "biometricEnabled", "createdAt", "currentStreak", "deepWorkSessions", "email", "emailNotifications", "emailVerificationExpires", "emailVerificationToken", "emailVerified", "examsPassed", "focusStrategy", "id", "lastLogin", "level", "longestStreak", "name", "passwordHash", "phone", "pomodoroSessions", "recoveryCodes", "refreshToken", "resetToken", "resetTokenExpires", "sleepTime", "smsNotifications", "tasksCompleted", "totalStudyTime", "totalXP", "twoFactorEnabled", "twoFactorSecret", "updatedAt", "username", "wakeUpTime" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Season_isActive_idx" ON "Season"("isActive");

-- CreateIndex
CREATE INDEX "Season_startDate_endDate_idx" ON "Season"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SeasonParticipation_seasonId_idx" ON "SeasonParticipation"("seasonId");

-- CreateIndex
CREATE INDEX "SeasonParticipation_userId_idx" ON "SeasonParticipation"("userId");

-- CreateIndex
CREATE INDEX "SeasonParticipation_seasonId_seasonXP_idx" ON "SeasonParticipation"("seasonId", "seasonXP");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonParticipation_userId_seasonId_key" ON "SeasonParticipation"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "Challenge_type_idx" ON "Challenge"("type");

-- CreateIndex
CREATE INDEX "Challenge_isActive_idx" ON "Challenge"("isActive");

-- CreateIndex
CREATE INDEX "Challenge_startDate_endDate_idx" ON "Challenge"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Challenge_category_idx" ON "Challenge"("category");

-- CreateIndex
CREATE INDEX "ChallengeCompletion_userId_idx" ON "ChallengeCompletion"("userId");

-- CreateIndex
CREATE INDEX "ChallengeCompletion_challengeId_idx" ON "ChallengeCompletion"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeCompletion_isCompleted_idx" ON "ChallengeCompletion"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeCompletion_userId_challengeId_key" ON "ChallengeCompletion"("userId", "challengeId");

-- CreateIndex
CREATE INDEX "QuestChain_isActive_idx" ON "QuestChain"("isActive");

-- CreateIndex
CREATE INDEX "QuestChain_category_idx" ON "QuestChain"("category");

-- CreateIndex
CREATE INDEX "Quest_chainId_idx" ON "Quest"("chainId");

-- CreateIndex
CREATE INDEX "Quest_order_idx" ON "Quest"("order");

-- CreateIndex
CREATE INDEX "QuestProgress_userId_idx" ON "QuestProgress"("userId");

-- CreateIndex
CREATE INDEX "QuestProgress_questId_idx" ON "QuestProgress"("questId");

-- CreateIndex
CREATE INDEX "QuestProgress_chainId_idx" ON "QuestProgress"("chainId");

-- CreateIndex
CREATE INDEX "QuestProgress_isCompleted_idx" ON "QuestProgress"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "QuestProgress_userId_questId_key" ON "QuestProgress"("userId", "questId");

-- CreateIndex
CREATE INDEX "Reward_type_idx" ON "Reward"("type");

-- CreateIndex
CREATE INDEX "Reward_rarity_idx" ON "Reward"("rarity");

-- CreateIndex
CREATE INDEX "Reward_isActive_idx" ON "Reward"("isActive");

-- CreateIndex
CREATE INDEX "UserReward_userId_idx" ON "UserReward"("userId");

-- CreateIndex
CREATE INDEX "UserReward_rewardId_idx" ON "UserReward"("rewardId");

-- CreateIndex
CREATE INDEX "UserReward_earnedAt_idx" ON "UserReward"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserReward_userId_rewardId_key" ON "UserReward"("userId", "rewardId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_type_idx" ON "LeaderboardEntry"("type");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_type_period_idx" ON "LeaderboardEntry"("type", "period");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_type_subject_idx" ON "LeaderboardEntry"("type", "subject");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_type_seasonId_idx" ON "LeaderboardEntry"("type", "seasonId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_type_totalXP_idx" ON "LeaderboardEntry"("type", "totalXP");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_userId_idx" ON "LeaderboardEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_type_period_subject_levelRange_seasonId_key" ON "LeaderboardEntry"("userId", "type", "period", "subject", "levelRange", "seasonId");
