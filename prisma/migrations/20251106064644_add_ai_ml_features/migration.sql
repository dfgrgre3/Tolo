-- CreateTable
CREATE TABLE "SentimentAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "emotions" JSONB,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SentimentAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiGeneratedContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "subject" TEXT,
    "metadata" JSONB,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiGeneratedContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemValue" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "source" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MlRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "algorithm" TEXT NOT NULL,
    "reason" TEXT,
    "shownAt" DATETIME,
    "clickedAt" DATETIME,
    "completedAt" DATETIME,
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MlRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SentimentAnalysis_userId_idx" ON "SentimentAnalysis"("userId");

-- CreateIndex
CREATE INDEX "SentimentAnalysis_sentiment_idx" ON "SentimentAnalysis"("sentiment");

-- CreateIndex
CREATE INDEX "SentimentAnalysis_createdAt_idx" ON "SentimentAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "SentimentAnalysis_userId_createdAt_idx" ON "SentimentAnalysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiChatMessage_userId_idx" ON "AiChatMessage"("userId");

-- CreateIndex
CREATE INDEX "AiChatMessage_createdAt_idx" ON "AiChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AiChatMessage_userId_createdAt_idx" ON "AiChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGeneratedContent_userId_idx" ON "AiGeneratedContent"("userId");

-- CreateIndex
CREATE INDEX "AiGeneratedContent_type_idx" ON "AiGeneratedContent"("type");

-- CreateIndex
CREATE INDEX "AiGeneratedContent_subject_idx" ON "AiGeneratedContent"("subject");

-- CreateIndex
CREATE INDEX "AiGeneratedContent_createdAt_idx" ON "AiGeneratedContent"("createdAt");

-- CreateIndex
CREATE INDEX "UserInteraction_userId_idx" ON "UserInteraction"("userId");

-- CreateIndex
CREATE INDEX "UserInteraction_type_idx" ON "UserInteraction"("type");

-- CreateIndex
CREATE INDEX "UserInteraction_itemType_idx" ON "UserInteraction"("itemType");

-- CreateIndex
CREATE INDEX "UserInteraction_timestamp_idx" ON "UserInteraction"("timestamp");

-- CreateIndex
CREATE INDEX "UserInteraction_userId_timestamp_idx" ON "UserInteraction"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ContentPreference_userId_idx" ON "ContentPreference"("userId");

-- CreateIndex
CREATE INDEX "ContentPreference_itemType_idx" ON "ContentPreference"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPreference_userId_itemType_itemValue_key" ON "ContentPreference"("userId", "itemType", "itemValue");

-- CreateIndex
CREATE INDEX "MlRecommendation_userId_idx" ON "MlRecommendation"("userId");

-- CreateIndex
CREATE INDEX "MlRecommendation_itemType_idx" ON "MlRecommendation"("itemType");

-- CreateIndex
CREATE INDEX "MlRecommendation_score_idx" ON "MlRecommendation"("score");

-- CreateIndex
CREATE INDEX "MlRecommendation_createdAt_idx" ON "MlRecommendation"("createdAt");

-- CreateIndex
CREATE INDEX "MlRecommendation_userId_createdAt_idx" ON "MlRecommendation"("userId", "createdAt");
