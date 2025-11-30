-- ============================================
-- تحسين شامل لقاعدة البيانات
-- Comprehensive Database Optimization
-- ============================================

-- ============================================
-- 1. إضافة فهارس مفقودة للجداول الرئيسية
-- ============================================

-- User table indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username") WHERE "username" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "User_emailVerified_idx" ON "User"("emailVerified") WHERE "emailVerified" = true;
        CREATE INDEX IF NOT EXISTS "User_lastLogin_idx" ON "User"("lastLogin") WHERE "lastLogin" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "User_twoFactorEnabled_idx" ON "User"("twoFactorEnabled") WHERE "twoFactorEnabled" = true;
        CREATE INDEX IF NOT EXISTS "User_level_idx" ON "User"("level");
        CREATE INDEX IF NOT EXISTS "User_totalXP_idx" ON "User"("totalXP");
    END IF;
END $$;

-- SubjectEnrollment indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SubjectEnrollment') THEN
        CREATE INDEX IF NOT EXISTS "SubjectEnrollment_userId_subject_idx" ON "SubjectEnrollment"("userId", "subject");
        CREATE INDEX IF NOT EXISTS "SubjectEnrollment_subject_idx" ON "SubjectEnrollment"("subject");
    END IF;
END $$;

-- StudySession indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StudySession') THEN
        CREATE INDEX IF NOT EXISTS "StudySession_userId_subject_idx" ON "StudySession"("userId", "subject");
        CREATE INDEX IF NOT EXISTS "StudySession_subject_idx" ON "StudySession"("subject");
        CREATE INDEX IF NOT EXISTS "StudySession_focusScore_idx" ON "StudySession"("focusScore") WHERE "focusScore" > 0;
        CREATE INDEX IF NOT EXISTS "StudySession_userId_createdAt_idx" ON "StudySession"("userId", "createdAt");
    END IF;
END $$;

-- Task indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Task') THEN
        CREATE INDEX IF NOT EXISTS "Task_userId_status_idx" ON "Task"("userId", "status");
        CREATE INDEX IF NOT EXISTS "Task_userId_subject_idx" ON "Task"("userId", "subject") WHERE "subject" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
        CREATE INDEX IF NOT EXISTS "Task_userId_completedAt_idx" ON "Task"("userId", "completedAt") WHERE "completedAt" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "Task_userId_scheduledAt_idx" ON "Task"("userId", "scheduledAt") WHERE "scheduledAt" IS NOT NULL;
    END IF;
END $$;

-- Reminder indexes
CREATE INDEX IF NOT EXISTS "Reminder_userId_createdAt_idx" ON "Reminder"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Reminder_remindAt_idx" ON "Reminder"("remindAt") WHERE "remindAt" > NOW();

-- Resource indexes
CREATE INDEX IF NOT EXISTS "Resource_subject_idx" ON "Resource"("subject");
CREATE INDEX IF NOT EXISTS "Resource_createdAt_idx" ON "Resource"("createdAt");
CREATE INDEX IF NOT EXISTS "Resource_free_idx" ON "Resource"("free") WHERE "free" = true;

-- Book indexes
CREATE INDEX IF NOT EXISTS "Book_author_idx" ON "Book"("author");
CREATE INDEX IF NOT EXISTS "Book_rating_idx" ON "Book"("rating") WHERE "rating" > 0;
CREATE INDEX IF NOT EXISTS "Book_views_idx" ON "Book"("views") WHERE "views" > 0;
CREATE INDEX IF NOT EXISTS "Book_subject_rating_idx" ON "Book"("subject", "rating");

-- Exam indexes
CREATE INDEX IF NOT EXISTS "Exam_subject_idx" ON "Exam"("subject");
CREATE INDEX IF NOT EXISTS "Exam_year_idx" ON "Exam"("year");

-- ============================================
-- 2. فهارس للجداول المتقدمة (Gamification)
-- ============================================

-- CustomGoal indexes
CREATE INDEX IF NOT EXISTS "CustomGoal_userId_isCompleted_idx" ON "CustomGoal"("userId", "isCompleted");
CREATE INDEX IF NOT EXISTS "CustomGoal_category_idx" ON "CustomGoal"("category");

-- UserAchievement indexes
CREATE INDEX IF NOT EXISTS "UserAchievement_userId_earnedAt_idx" ON "UserAchievement"("userId", "earnedAt");

-- Season indexes
CREATE INDEX IF NOT EXISTS "Season_startDate_endDate_idx" ON "Season"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "Season_isActive_startDate_idx" ON "Season"("isActive", "startDate") WHERE "isActive" = true;

-- SeasonParticipation indexes
CREATE INDEX IF NOT EXISTS "SeasonParticipation_seasonId_rank_idx" ON "SeasonParticipation"("seasonId", "rank") WHERE "rank" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "SeasonParticipation_seasonId_seasonXP_idx" ON "SeasonParticipation"("seasonId", "seasonXP");

-- Challenge indexes
CREATE INDEX IF NOT EXISTS "Challenge_type_isActive_idx" ON "Challenge"("type", "isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS "Challenge_category_difficulty_idx" ON "Challenge"("category", "difficulty");

-- ChallengeCompletion indexes
CREATE INDEX IF NOT EXISTS "ChallengeCompletion_userId_isCompleted_idx" ON "ChallengeCompletion"("userId", "isCompleted");
CREATE INDEX IF NOT EXISTS "ChallengeCompletion_challengeId_completedAt_idx" ON "ChallengeCompletion"("challengeId", "completedAt") WHERE "completedAt" IS NOT NULL;

-- Quest indexes
CREATE INDEX IF NOT EXISTS "Quest_chainId_order_idx" ON "Quest"("chainId", "order");
CREATE INDEX IF NOT EXISTS "Quest_chainId_isActive_idx" ON "Quest"("chainId", "isActive") WHERE "isActive" = true;

-- QuestProgress indexes
CREATE INDEX IF NOT EXISTS "QuestProgress_userId_chainId_idx" ON "QuestProgress"("userId", "chainId");
CREATE INDEX IF NOT EXISTS "QuestProgress_userId_isCompleted_idx" ON "QuestProgress"("userId", "isCompleted") WHERE "isCompleted" = true;

-- LeaderboardEntry indexes
CREATE INDEX IF NOT EXISTS "LeaderboardEntry_type_period_totalXP_idx" ON "LeaderboardEntry"("type", "period", "totalXP");
CREATE INDEX IF NOT EXISTS "LeaderboardEntry_type_subject_totalXP_idx" ON "LeaderboardEntry"("type", "subject", "totalXP") WHERE "subject" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "LeaderboardEntry_type_seasonId_totalXP_idx" ON "LeaderboardEntry"("type", "seasonId", "totalXP") WHERE "seasonId" IS NOT NULL;

-- ============================================
-- 3. فهارس للجداول الأمنية والمصادقة
-- ============================================

-- Session indexes
CREATE INDEX IF NOT EXISTS "Session_userId_lastAccessed_idx" ON "Session"("userId", "lastAccessed");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_isActive_idx" ON "Session"("expiresAt", "isActive") WHERE "isActive" = true;

-- SecurityLog indexes
CREATE INDEX IF NOT EXISTS "SecurityLog_userId_createdAt_idx" ON "SecurityLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityLog_ip_createdAt_idx" ON "SecurityLog"("ip", "createdAt");

-- TwoFactorChallenge indexes
CREATE INDEX IF NOT EXISTS "TwoFactorChallenge_userId_expiresAt_idx" ON "TwoFactorChallenge"("userId", "expiresAt") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "TwoFactorChallenge_expiresAt_used_idx" ON "TwoFactorChallenge"("expiresAt", "used") WHERE "used" = false;

-- BiometricChallenge indexes
CREATE INDEX IF NOT EXISTS "BiometricChallenge_userId_type_idx" ON "BiometricChallenge"("userId", "type") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "BiometricChallenge_expiresAt_used_idx" ON "BiometricChallenge"("expiresAt", "used") WHERE "used" = false;

-- ============================================
-- 4. فهارس للجداول AI & ML
-- ============================================

-- SentimentAnalysis indexes
CREATE INDEX IF NOT EXISTS "SentimentAnalysis_userId_sentiment_idx" ON "SentimentAnalysis"("userId", "sentiment");
CREATE INDEX IF NOT EXISTS "SentimentAnalysis_sentiment_score_idx" ON "SentimentAnalysis"("sentiment", "score");

-- AiChatMessage indexes
CREATE INDEX IF NOT EXISTS "AiChatMessage_userId_role_idx" ON "AiChatMessage"("userId", "role");
CREATE INDEX IF NOT EXISTS "AiChatMessage_userId_sentiment_idx" ON "AiChatMessage"("userId", "sentiment") WHERE "sentiment" IS NOT NULL;

-- AiGeneratedContent indexes
CREATE INDEX IF NOT EXISTS "AiGeneratedContent_userId_type_isUsed_idx" ON "AiGeneratedContent"("userId", "type", "isUsed");
CREATE INDEX IF NOT EXISTS "AiGeneratedContent_subject_type_idx" ON "AiGeneratedContent"("subject", "type") WHERE "subject" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "AiGeneratedContent_isUsed_idx" ON "AiGeneratedContent"("isUsed") WHERE "isUsed" = false;

-- UserInteraction indexes
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_type_itemType_idx" ON "UserInteraction"("userId", "type", "itemType");
CREATE INDEX IF NOT EXISTS "UserInteraction_itemType_itemId_idx" ON "UserInteraction"("itemType", "itemId");
CREATE INDEX IF NOT EXISTS "UserInteraction_userId_itemType_timestamp_idx" ON "UserInteraction"("userId", "itemType", "timestamp");

-- ContentPreference indexes
CREATE INDEX IF NOT EXISTS "ContentPreference_userId_itemType_weight_idx" ON "ContentPreference"("userId", "itemType", "weight");

-- MlRecommendation indexes
CREATE INDEX IF NOT EXISTS "MlRecommendation_userId_itemType_score_idx" ON "MlRecommendation"("userId", "itemType", "score");
CREATE INDEX IF NOT EXISTS "MlRecommendation_userId_algorithm_idx" ON "MlRecommendation"("userId", "algorithm");
CREATE INDEX IF NOT EXISTS "MlRecommendation_itemType_itemId_score_idx" ON "MlRecommendation"("itemType", "itemId", "score");
CREATE INDEX IF NOT EXISTS "MlRecommendation_userId_shownAt_idx" ON "MlRecommendation"("userId", "shownAt") WHERE "shownAt" IS NOT NULL;

-- ============================================
-- 5. فهارس للإشعارات
-- ============================================

-- Notification indexes (already exist but adding composite ones)
CREATE INDEX IF NOT EXISTS "Notification_userId_type_isRead_idx" ON "Notification"("userId", "type", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_isRead_createdAt_idx" ON "Notification"("isRead", "createdAt") WHERE "isRead" = false;

-- ============================================
-- 6. تحسين الفهارس الموجودة (إعادة إنشاء محسّنة)
-- ============================================

-- Note: لا نحذف الفهارس الموجودة، بل نضيف فهارس إضافية محسّنة
-- We don't delete existing indexes, we add optimized additional ones

-- ============================================
-- 7. إضافة قيود (Constraints) لضمان سلامة البيانات
-- ============================================

-- Ensure email is lowercase (handled at application level, but adding check constraint)
-- Note: PostgreSQL doesn't support CHECK constraints with functions easily, so we'll handle this in application

-- Ensure score values are in valid range
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ExamResult') 
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExamResult_score_check') THEN
        ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_score_check" CHECK ("score" >= 0 AND "score" <= 100);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProgressSnapshot')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgressSnapshot_gradeAverage_check') THEN
        ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_gradeAverage_check" CHECK ("gradeAverage" IS NULL OR ("gradeAverage" >= 0 AND "gradeAverage" <= 100));
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ProgressSnapshot')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgressSnapshot_improvementRate_check') THEN
        ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_improvementRate_check" CHECK ("improvementRate" IS NULL OR "improvementRate" >= -100);
    END IF;
END $$;

-- Ensure XP values are non-negative
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_totalXP_check') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_totalXP_check" CHECK ("totalXP" >= 0);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_level_check') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_level_check" CHECK ("level" >= 1);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_currentStreak_check') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_currentStreak_check" CHECK ("currentStreak" >= 0);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_longestStreak_check') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_longestStreak_check" CHECK ("longestStreak" >= 0);
    END IF;
END $$;

-- Ensure duration values are positive
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StudySession')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudySession_durationMin_check') THEN
        ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_durationMin_check" CHECK ("durationMin" > 0);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StudySession')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudySession_focusScore_check') THEN
        ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_focusScore_check" CHECK ("focusScore" >= 0 AND "focusScore" <= 100);
    END IF;
END $$;

-- Ensure dates are logical
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StudySession')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudySession_time_check') THEN
        ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_time_check" CHECK ("endTime" > "startTime");
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Task')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_dueAt_check') THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_dueAt_check" CHECK ("dueAt" IS NULL OR "dueAt" >= "createdAt");
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Task')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_completedAt_check') THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_completedAt_check" CHECK ("completedAt" IS NULL OR "completedAt" >= "createdAt");
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Session')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_expiresAt_check') THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_expiresAt_check" CHECK ("expiresAt" > "createdAt");
    END IF;
END $$;

-- Ensure rating values are in valid range
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Book')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Book_rating_check') THEN
        ALTER TABLE "Book" ADD CONSTRAINT "Book_rating_check" CHECK ("rating" >= 0 AND "rating" <= 5);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Book')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Book_views_check') THEN
        ALTER TABLE "Book" ADD CONSTRAINT "Book_views_check" CHECK ("views" >= 0);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Book')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Book_downloads_check') THEN
        ALTER TABLE "Book" ADD CONSTRAINT "Book_downloads_check" CHECK ("downloads" >= 0);
    END IF;
END $$;

-- Ensure progress values are in valid range
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ChallengeCompletion')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChallengeCompletion_progress_check') THEN
        ALTER TABLE "ChallengeCompletion" ADD CONSTRAINT "ChallengeCompletion_progress_check" CHECK ("progress" >= 0 AND "progress" <= 100);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'QuestProgress')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestProgress_progress_check') THEN
        ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_progress_check" CHECK ("progress" >= 0 AND "progress" <= 100);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ContentPreference')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentPreference_weight_check') THEN
        ALTER TABLE "ContentPreference" ADD CONSTRAINT "ContentPreference_weight_check" CHECK ("weight" > 0);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MlRecommendation')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MlRecommendation_score_check') THEN
        ALTER TABLE "MlRecommendation" ADD CONSTRAINT "MlRecommendation_score_check" CHECK ("score" >= 0 AND "score" <= 1);
    END IF;
END $$;

-- ============================================
-- 8. تحسين أنواع البيانات (VACUUM & ANALYZE)
-- ============================================

-- Update table statistics for better query planning
ANALYZE "User";
ANALYZE "SubjectEnrollment";
ANALYZE "StudySession";
ANALYZE "Task";
ANALYZE "Reminder";
ANALYZE "ProgressSnapshot";
ANALYZE "Resource";
ANALYZE "Book";
ANALYZE "Exam";
ANALYZE "ExamResult";
ANALYZE "Session";
ANALYZE "SecurityLog";
ANALYZE "Notification";
ANALYZE "Achievement";
ANALYZE "UserAchievement";
ANALYZE "CustomGoal";
ANALYZE "Season";
ANALYZE "SeasonParticipation";
ANALYZE "Challenge";
ANALYZE "ChallengeCompletion";
ANALYZE "QuestChain";
ANALYZE "Quest";
ANALYZE "QuestProgress";
ANALYZE "Reward";
ANALYZE "UserReward";
ANALYZE "LeaderboardEntry";
ANALYZE "SentimentAnalysis";
ANALYZE "AiChatMessage";
ANALYZE "AiGeneratedContent";
ANALYZE "UserInteraction";
ANALYZE "ContentPreference";
ANALYZE "MlRecommendation";
ANALYZE "TwoFactorChallenge";
ANALYZE "BiometricChallenge";

-- ============================================
-- 9. إنشاء فهارس نصية (Full-Text Search) للبحث
-- ============================================

-- Note: Full-text search indexes require specific setup in PostgreSQL
-- These are commented out as they require additional configuration
-- Uncomment and configure if you need full-text search

-- CREATE INDEX IF NOT EXISTS "Book_title_search_idx" ON "Book" USING gin(to_tsvector('arabic', "title" || ' ' || COALESCE("description", '')));
-- CREATE INDEX IF NOT EXISTS "Resource_title_search_idx" ON "Resource" USING gin(to_tsvector('arabic', "title" || ' ' || COALESCE("description", '')));
-- CREATE INDEX IF NOT EXISTS "Task_title_search_idx" ON "Task" USING gin(to_tsvector('arabic', "title" || ' ' || COALESCE("description", '')));

-- ============================================
-- 10. تحسين إعدادات PostgreSQL
-- ============================================

-- Note: These settings should be configured at the database level
-- They are included here for reference

-- Recommended PostgreSQL settings for better performance:
-- shared_buffers = 25% of RAM
-- effective_cache_size = 50-75% of RAM
-- maintenance_work_mem = 1-2GB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- random_page_cost = 1.1 (for SSD)
-- effective_io_concurrency = 200 (for SSD)

-- ============================================
-- ملاحظات مهمة:
-- ============================================
-- 1. تم إضافة فهارس محسّنة لجميع الجداول الرئيسية
-- 2. تم إضافة قيود (Constraints) لضمان سلامة البيانات
-- 3. تم تحديث إحصائيات الجداول لتحسين أداء الاستعلامات
-- 4. الفهارس الجزئية (Partial Indexes) تستخدم WHERE لتحسين الأداء
-- 5. جميع الفهارس تستخدم IF NOT EXISTS لتجنب الأخطاء
-- ============================================

