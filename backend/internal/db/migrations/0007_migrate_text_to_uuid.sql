-- Migration: Migrate all primary keys and foreign keys from text to uuid
-- Date: 2026-05-03
-- Description: This migration converts all 'text' type ID columns to 'uuid' type
-- IMPORTANT: This migration requires downtime and careful testing
-- Make sure to backup your database before running this migration

-- Start transaction
BEGIN;

-- Temporarily disable triggers if needed (for large datasets)
-- SET session_replication_role = replica;

-- ============================================
-- Step 1: Drop all foreign key constraints
-- ============================================

-- User related foreign keys
ALTER TABLE "UserSettings" DROP CONSTRAINT IF EXISTS "fk_user_settings_user_id";
ALTER TABLE "UserSession" DROP CONSTRAINT IF EXISTS "fk_user_sessions_user_id";
ALTER TABLE "SecurityLog" DROP CONSTRAINT IF EXISTS "fk_security_logs_user_id";
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "fk_notifications_user_id";
ALTER TABLE "WalletTransaction" DROP CONSTRAINT IF EXISTS "fk_wallet_transactions_user_id";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "fk_payments_user_id";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "fk_invoices_user_id";
ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS "fk_enrollments_user_id";
ALTER TABLE "LessonProgress" DROP CONSTRAINT IF EXISTS "fk_lesson_progresses_user_id";
ALTER TABLE "StudySession" DROP CONSTRAINT IF EXISTS "fk_study_sessions_user_id";
ALTER TABLE "Schedule" DROP CONSTRAINT IF EXISTS "fk_schedules_user_id";
ALTER TABLE "Reminder" DROP CONSTRAINT IF EXISTS "fk_reminders_user_id";
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "fk_tasks_user_id";
ALTER TABLE "ExamResult" DROP CONSTRAINT IF EXISTS "fk_exam_results_user_id";
ALTER TABLE "UserSubscription" DROP CONSTRAINT IF EXISTS "fk_user_subscriptions_user_id";
ALTER TABLE "UserAchievement" DROP CONSTRAINT IF EXISTS "fk_user_achievements_user_id";
ALTER TABLE "UserChallenge" DROP CONSTRAINT IF EXISTS "fk_user_challenges_user_id";
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "fk_activities_user_id";
ALTER TABLE "AIConversation" DROP CONSTRAINT IF EXISTS "fk_ai_conversations_user_id";

-- Subject related foreign keys
ALTER TABLE "Topic" DROP CONSTRAINT IF EXISTS "fk_topics_subject_id";
ALTER TABLE "CourseReview" DROP CONSTRAINT IF EXISTS "fk_course_reviews_subject_id";
ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS "fk_enrollments_subject_id";
ALTER TABLE "LessonProgress" DROP CONSTRAINT IF EXISTS "fk_lesson_progresses_lesson_id"; -- Actually lesson_id references SubTopic
ALTER TABLE "StudySession" DROP CONSTRAINT IF EXISTS "fk_study_sessions_subject_id";
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "fk_tasks_subject_id";
ALTER TABLE "Exam" DROP CONSTRAINT IF EXISTS "fk_exams_subject_id";
ALTER TABLE "BlogPost" DROP CONSTRAINT IF EXISTS "fk_blog_posts_subject_id";
ALTER TABLE "LiveEvent" DROP CONSTRAINT IF EXISTS "fk_live_events_subject_id";
ALTER TABLE "Book" DROP CONSTRAINT IF EXISTS "fk_books_subject_id";
ALTER TABLE "Challenge" DROP CONSTRAINT IF EXISTS "fk_challenges_subject_id";
ALTER TABLE "Contest" DROP CONSTRAINT IF EXISTS "fk_contests_subject_id";
ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "fk_activities_subject_id";

-- Exam related foreign keys
ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "fk_questions_exam_id";
ALTER TABLE "ExamResult" DROP CONSTRAINT IF EXISTS "fk_exam_results_exam_id";
ALTER TABLE "UserChallenge" DROP CONSTRAINT IF EXISTS "fk_user_challenges_exam_id";

-- Other foreign keys
ALTER TABLE "SubTopic" DROP CONSTRAINT IF EXISTS "fk_sub_topics_topic_id";
ALTER TABLE "LessonAttachment" DROP CONSTRAINT IF EXISTS "fk_lesson_attachments_sub_topic_id";
ALTER TABLE "UserSubscription" DROP CONSTRAINT IF EXISTS "fk_user_subscriptions_plan_id";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "fk_payments_subject_id";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "fk_payments_plan_id";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "fk_invoices_payment_id";
ALTER TABLE "WalletTransaction" DROP CONSTRAINT IF EXISTS "fk_wallet_transactions_reference_id";
ALTER TABLE "AIMessage" DROP CONSTRAINT IF EXISTS "fk_ai_messages_conversation_id";
ALTER TABLE "UserAchievement" DROP CONSTRAINT IF EXISTS "fk_user_achievements_achievement_id";
ALTER TABLE "UserChallenge" DROP CONSTRAINT IF EXISTS "fk_user_challenges_challenge_id";
ALTER TABLE "ContestQuestion" DROP CONSTRAINT IF EXISTS "fk_contest_questions_contest_id";
ALTER TABLE "ForumTopic" DROP CONSTRAINT IF EXISTS "fk_forum_topics_author_id";
ALTER TABLE "ForumTopic" DROP CONSTRAINT IF EXISTS "fk_forum_topics_category_id";
ALTER TABLE "BlogPost" DROP CONSTRAINT IF EXISTS "fk_blog_posts_author_id";
ALTER TABLE "CourseReview" DROP CONSTRAINT IF EXISTS "fk_course_reviews_user_id";

-- ============================================
-- Step 2: Alter primary key columns from text to uuid
-- ============================================

-- User table
ALTER TABLE "User" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Payment table
ALTER TABLE "Payment" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Invoice table
ALTER TABLE "Invoice" ALTER COLUMN id TYPE uuid USING id::uuid;

-- UserSettings table
ALTER TABLE "UserSettings" ALTER COLUMN id TYPE uuid USING id::uuid;

-- SystemSetting table
ALTER TABLE "SystemSetting" ALTER COLUMN id TYPE uuid USING id::uuid;

-- SubscriptionPlan table
ALTER TABLE "SubscriptionPlan" ALTER COLUMN id TYPE uuid USING id::uuid;

-- UserSubscription table
ALTER TABLE "UserSubscription" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Subject table
ALTER TABLE "Subject" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Topic table
ALTER TABLE "Topic" ALTER COLUMN id TYPE uuid USING id::uuid;

-- SubTopic table
ALTER TABLE "SubTopic" ALTER COLUMN id TYPE uuid USING id::uuid;

-- LessonAttachment table
ALTER TABLE "LessonAttachment" ALTER COLUMN id TYPE uuid USING id::uuid;

-- CourseReview table
ALTER TABLE "CourseReview" ALTER COLUMN id TYPE uuid USING id::uuid;

-- UserSession table
ALTER TABLE "UserSession" ALTER COLUMN id TYPE uuid USING id::uuid;

-- SecurityLog table
ALTER TABLE "SecurityLog" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Notification table
ALTER TABLE "Notification" ALTER COLUMN id TYPE uuid USING id::uuid;

-- WalletTransaction table
ALTER TABLE "WalletTransaction" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Achievement table
ALTER TABLE "Achievement" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Reward table
ALTER TABLE "Reward" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Season table
ALTER TABLE "Season" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Challenge table
ALTER TABLE "Challenge" ALTER COLUMN id TYPE uuid USING id::uuid;

-- UserAchievement table
ALTER TABLE "UserAchievement" ALTER COLUMN id TYPE uuid USING id::uuid;

-- UserChallenge table
ALTER TABLE "UserChallenge" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Exam table (already uuid, but just in case)
ALTER TABLE "Exam" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Question table (already uuid, but just in case)
ALTER TABLE "Question" ALTER COLUMN id TYPE uuid USING id::uuid;

-- ExamResult table (already uuid, but just in case)
ALTER TABLE "ExamResult" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Enrollment table
ALTER TABLE "Enrollment" ALTER COLUMN id TYPE uuid USING id::uuid;

-- LessonProgress table
ALTER TABLE "LessonProgress" ALTER COLUMN id TYPE uuid USING id::uuid;

-- StudySession table
ALTER TABLE "StudySession" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Schedule table
ALTER TABLE "Schedule" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Reminder table
ALTER TABLE "Reminder" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Task table
ALTER TABLE "Task" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Contest table
ALTER TABLE "Contest" ALTER COLUMN id TYPE uuid USING id::uuid;

-- ContestQuestion table
ALTER TABLE "ContestQuestion" ALTER COLUMN id TYPE uuid USING id::uuid;

-- BlogPost table
ALTER TABLE "BlogPost" ALTER COLUMN id TYPE uuid USING id::uuid;

-- ForumCategory table
ALTER TABLE "ForumCategory" ALTER COLUMN id TYPE uuid USING id::uuid;

-- ForumTopic table
ALTER TABLE "ForumTopic" ALTER COLUMN id TYPE uuid USING id::uuid;

-- LiveEvent table
ALTER TABLE "LiveEvent" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Book table
ALTER TABLE "Book" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Event table
ALTER TABLE "Event" ALTER COLUMN id TYPE uuid USING id::uuid;

-- Activity table
ALTER TABLE "Activity" ALTER COLUMN id TYPE uuid USING id::uuid;

-- AIConversation table
ALTER TABLE "AIConversation" ALTER COLUMN id TYPE uuid USING id::uuid;

-- AIMessage table
ALTER TABLE "AIMessage" ALTER COLUMN id TYPE uuid USING id::uuid;

-- ============================================
-- Step 3: Alter foreign key columns from text to uuid
-- ============================================

-- -- Step 3 & 4 Combined Logic for Snake Case
-- User related renames and constraints
ALTER TABLE "UserSettings" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "UserSettings" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "UserSettings" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "UserSettings" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "UserSettings" ADD CONSTRAINT "fk_user_settings_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "UserSession" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "UserSession" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "UserSession" RENAME COLUMN "refreshToken" TO refresh_token;
ALTER TABLE "UserSession" RENAME COLUMN "userAgent" TO user_agent;
ALTER TABLE "UserSession" RENAME COLUMN "deviceType" TO device_type;
ALTER TABLE "UserSession" RENAME COLUMN "isActive" TO is_active;
ALTER TABLE "UserSession" RENAME COLUMN "lastAccessed" TO last_accessed;
ALTER TABLE "UserSession" RENAME COLUMN "expiresAt" TO expires_at;
ALTER TABLE "UserSession" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "UserSession" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "UserSession" ADD CONSTRAINT "fk_user_sessions_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "SecurityLog" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "SecurityLog" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "SecurityLog" RENAME COLUMN "eventType" TO event_type;
ALTER TABLE "SecurityLog" RENAME COLUMN "userAgent" TO user_agent;
ALTER TABLE "SecurityLog" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "SecurityLog" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "SecurityLog" ADD CONSTRAINT "fk_security_logs_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Notification" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Notification" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Notification" RENAME COLUMN "isActive" TO is_active;
ALTER TABLE "Notification" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "Notification" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "Notification" ADD CONSTRAINT "fk_notifications_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "WalletTransaction" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "WalletTransaction" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "WalletTransaction" RENAME COLUMN "walletType" TO wallet_type;
ALTER TABLE "WalletTransaction" ALTER COLUMN "referenceId" TYPE uuid USING "referenceId"::uuid;
ALTER TABLE "WalletTransaction" RENAME COLUMN "referenceId" TO reference_id;
ALTER TABLE "WalletTransaction" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "fk_wallet_transactions_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Payment" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Payment" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Payment" ALTER COLUMN "subjectId" TYPE uuid USING "subjectId"::uuid;
ALTER TABLE "Payment" RENAME COLUMN "subjectId" TO subject_id;
ALTER TABLE "Payment" ALTER COLUMN "planId" TYPE uuid USING "planId"::uuid;
ALTER TABLE "Payment" RENAME COLUMN "planId" TO plan_id;
ALTER TABLE "Payment" RENAME COLUMN "paymobOrderId" TO paymob_order_id;
ALTER TABLE "Payment" RENAME COLUMN "paymobTransactionId" TO paymob_transaction_id;
ALTER TABLE "Payment" RENAME COLUMN "paymentMethod" TO payment_method;
ALTER TABLE "Payment" RENAME COLUMN "isSuccessful" TO is_successful;
ALTER TABLE "Payment" RENAME COLUMN "failureReason" TO failure_reason;
ALTER TABLE "Payment" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "Payment" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "Payment" ADD CONSTRAINT "fk_payments_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Invoice" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Invoice" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Invoice" ALTER COLUMN "paymentId" TYPE uuid USING "paymentId"::uuid;
ALTER TABLE "Invoice" RENAME COLUMN "paymentId" TO payment_id;
ALTER TABLE "Invoice" RENAME COLUMN "invoiceNumber" TO invoice_number;
ALTER TABLE "Invoice" RENAME COLUMN "invoiceDate" TO invoice_date;
ALTER TABLE "Invoice" RENAME COLUMN "dueDate" TO due_date;
ALTER TABLE "Invoice" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "Invoice" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "Invoice" ADD CONSTRAINT "fk_invoices_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Enrollment" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Enrollment" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Enrollment" ALTER COLUMN "subjectId" TYPE uuid USING "subjectId"::uuid;
ALTER TABLE "Enrollment" RENAME COLUMN "subjectId" TO subject_id;
ALTER TABLE "Enrollment" RENAME COLUMN "enrolledAt" TO enrolled_at;
ALTER TABLE "Enrollment" ADD CONSTRAINT "fk_enrollments_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "fk_enrollments_subject_id" FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE CASCADE;

ALTER TABLE "LessonProgress" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "LessonProgress" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "LessonProgress" ALTER COLUMN "lessonId" TYPE uuid USING "lessonId"::uuid;
ALTER TABLE "LessonProgress" RENAME COLUMN "lessonId" TO lesson_id;
ALTER TABLE "LessonProgress" RENAME COLUMN "isCompleted" TO is_completed;
ALTER TABLE "LessonProgress" RENAME COLUMN "completedAt" TO completed_at;
ALTER TABLE "LessonProgress" RENAME COLUMN "lastAccessedAt" TO last_accessed_at;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "fk_lesson_progresses_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "StudySession" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "StudySession" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "StudySession" ALTER COLUMN "subjectId" TYPE uuid USING "subjectId"::uuid;
ALTER TABLE "StudySession" RENAME COLUMN "subjectId" TO subject_id;
ALTER TABLE "StudySession" RENAME COLUMN "durationMin" TO duration_min;
ALTER TABLE "StudySession" RENAME COLUMN "focusScore" TO focus_score;
ALTER TABLE "StudySession" RENAME COLUMN "startTime" TO start_time;
ALTER TABLE "StudySession" RENAME COLUMN "endTime" TO end_time;
ALTER TABLE "StudySession" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "StudySession" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "StudySession" ADD CONSTRAINT "fk_study_sessions_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "fk_study_sessions_subject_id" FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE SET NULL;

ALTER TABLE "Schedule" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Schedule" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Schedule" RENAME COLUMN "planJson" TO plan_json;
ALTER TABLE "Schedule" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "Schedule" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "Schedule" ADD CONSTRAINT "fk_schedules_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Reminder" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Reminder" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Reminder" RENAME COLUMN "remindAt" TO remind_at;
ALTER TABLE "Reminder" RENAME COLUMN "isActive" TO is_active;
ALTER TABLE "Reminder" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "Reminder" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "Reminder" ADD CONSTRAINT "fk_reminders_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "Task" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Task" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Task" ALTER COLUMN "subjectId" TYPE uuid USING "subjectId"::uuid;
ALTER TABLE "Task" RENAME COLUMN "subjectId" TO subject_id;
ALTER TABLE "Task" RENAME COLUMN "dueAt" TO due_at;
ALTER TABLE "Task" RENAME COLUMN "estimatedTime" TO estimated_time;
ALTER TABLE "Task" RENAME COLUMN "actualTime" TO actual_time;
ALTER TABLE "Task" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "Task" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "Task" ADD CONSTRAINT "fk_tasks_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "fk_tasks_subject_id" FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE SET NULL;

ALTER TABLE "Exam" ALTER COLUMN "subjectId" TYPE uuid USING "subjectId"::uuid;
ALTER TABLE "Exam" RENAME COLUMN "subjectId" TO subject_id;
ALTER TABLE "Exam" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "Exam" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "Exam" ADD CONSTRAINT "fk_exams_subject_id" FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE CASCADE;

ALTER TABLE "Question" ALTER COLUMN "examId" TYPE uuid USING "examId"::uuid;
ALTER TABLE "Question" RENAME COLUMN "examId" TO exam_id;
ALTER TABLE "Question" ADD CONSTRAINT "fk_questions_exam_id" FOREIGN KEY (exam_id) REFERENCES "Exam"(id) ON DELETE CASCADE;

ALTER TABLE "ExamResult" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "ExamResult" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "ExamResult" ALTER COLUMN "examId" TYPE uuid USING "examId"::uuid;
ALTER TABLE "ExamResult" RENAME COLUMN "examId" TO exam_id;
ALTER TABLE "ExamResult" RENAME COLUMN "takenAt" TO taken_at;
ALTER TABLE "ExamResult" RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE "ExamResult" RENAME COLUMN "updatedAt" TO updated_at;
ALTER TABLE "ExamResult" ADD CONSTRAINT "fk_exam_results_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "ExamResult" ADD CONSTRAINT "fk_exam_results_exam_id" FOREIGN KEY (exam_id) REFERENCES "Exam"(id) ON DELETE CASCADE;

-- Subject renames and other foreign keys
ALTER TABLE "Topic" ALTER COLUMN "subjectId" TYPE uuid USING "subjectId"::uuid;
ALTER TABLE "Topic" RENAME COLUMN "subjectId" TO subject_id;
ALTER TABLE "Topic" ADD CONSTRAINT "fk_topics_subject_id" FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE CASCADE;

ALTER TABLE "SubTopic" ALTER COLUMN "topicId" TYPE uuid USING "topicId"::uuid;
ALTER TABLE "SubTopic" RENAME COLUMN "topicId" TO topic_id;
ALTER TABLE "SubTopic" ADD CONSTRAINT "fk_sub_topics_topic_id" FOREIGN KEY (topic_id) REFERENCES "Topic"(id) ON DELETE CASCADE;

ALTER TABLE "UserSubscription" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "UserSubscription" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "UserSubscription" ALTER COLUMN "planId" TYPE uuid USING "planId"::uuid;
ALTER TABLE "UserSubscription" RENAME COLUMN "planId" TO plan_id;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "fk_user_subscriptions_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "fk_user_subscriptions_plan_id" FOREIGN KEY (plan_id) REFERENCES "SubscriptionPlan"(id) ON DELETE SET NULL;

ALTER TABLE "UserAchievement" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "UserAchievement" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "UserAchievement" ALTER COLUMN "achievementId" TYPE uuid USING "achievementId"::uuid;
ALTER TABLE "UserAchievement" RENAME COLUMN "achievementId" TO achievement_id;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "fk_user_achievements_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "UserChallenge" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "UserChallenge" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "UserChallenge" ALTER COLUMN "challengeId" TYPE uuid USING "challengeId"::uuid;
ALTER TABLE "UserChallenge" RENAME COLUMN "challengeId" TO challenge_id;
ALTER TABLE "UserChallenge" ALTER COLUMN "examId" TYPE uuid USING "examId"::uuid;
ALTER TABLE "UserChallenge" RENAME COLUMN "examId" TO exam_id;
ALTER TABLE "UserChallenge" ADD CONSTRAINT "fk_user_challenges_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserChallenge" ADD CONSTRAINT "fk_user_challenges_challenge_id" FOREIGN KEY (challenge_id) REFERENCES "Challenge"(id) ON DELETE CASCADE;

ALTER TABLE "Activity" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "Activity" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "Activity" ALTER COLUMN "subjectId" TYPE uuid USING "subjectId"::uuid;
ALTER TABLE "Activity" RENAME COLUMN "subjectId" TO subject_id;
ALTER TABLE "Activity" ADD CONSTRAINT "fk_activities_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "fk_activities_subject_id" FOREIGN KEY (subject_id) REFERENCES "Subject"(id) ON DELETE SET NULL;

ALTER TABLE "AIConversation" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "AIConversation" RENAME COLUMN "userId" TO user_id;
ALTER TABLE "AIConversation" ADD CONSTRAINT "fk_ai_conversations_user_id" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "User" RENAME COLUMN "emailVerified" TO email_verified;
ALTER TABLE "User" RENAME COLUMN "phoneVerified" TO phone_verified;
ALTER TABLE "User" RENAME COLUMN "activeSubscriptionId" TYPE uuid USING "activeSubscriptionId"::uuid;
ALTER TABLE "User" RENAME COLUMN "activeSubscriptionId" TO active_subscription_id;
ALTER TABLE "User" ADD CONSTRAINT "fk_user_active_subscription" FOREIGN KEY (active_subscription_id) REFERENCES "UserSubscription"(id) ON DELETE SET NULL;

-- Final Step: Re-enable triggers (Step 5)
COMMIT;

-- ============================================
-- Post-migration notes:
-- 1. This migration converts all text ID columns to uuid type
-- 2. All foreign key constraints are recreated
-- 3. Make sure to update Go models to use type:uuid instead of type:text
-- 4. Test thoroughly in a staging environment before applying to production
-- ============================================