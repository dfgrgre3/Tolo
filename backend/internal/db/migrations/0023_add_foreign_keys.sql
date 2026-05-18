-- Migration 0023: Add missing foreign key constraints
-- This migration restores referential integrity across the schema

BEGIN;

-- Users & Auth
ALTER TABLE "User" ADD CONSTRAINT fk_user_settings_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT fk_session_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "PasswordHistory" ADD CONSTRAINT fk_password_history_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

-- Notifications
ALTER TABLE "Notification" ADD CONSTRAINT fk_notification_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

-- Educational Content
ALTER TABLE "Subject" ADD CONSTRAINT fk_subject_category FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE SET NULL;
ALTER TABLE "Topic" ADD CONSTRAINT fk_topic_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE CASCADE;
ALTER TABLE "SubTopic" ADD CONSTRAINT fk_subtopic_topic FOREIGN KEY ("topicId") REFERENCES "Topic"(id) ON DELETE CASCADE;
ALTER TABLE "SubjectCertificate" ADD CONSTRAINT fk_certificate_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "SubjectCertificate" ADD CONSTRAINT fk_certificate_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE CASCADE;

-- Enrollments
ALTER TABLE "Enrollment" ADD CONSTRAINT fk_enrollment_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT fk_enrollment_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE CASCADE;

-- Exams & Results
ALTER TABLE "ExamResult" ADD CONSTRAINT fk_exam_result_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT fk_test_result_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT fk_test_result_exam FOREIGN KEY ("examId") REFERENCES "Exam"(id) ON DELETE CASCADE;

-- AI
ALTER TABLE "AiChatMessage" ADD CONSTRAINT fk_ai_chat_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "AiGeneratedContent" ADD CONSTRAINT fk_ai_content_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE "AiGeneratedContent" ADD CONSTRAINT fk_ai_content_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;
ALTER TABLE "AiGeneratedExam" ADD CONSTRAINT fk_ai_exam_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "AiGeneratedExam" ADD CONSTRAINT fk_ai_exam_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;
ALTER TABLE "AiQuestion" ADD CONSTRAINT fk_ai_question_exam FOREIGN KEY ("examId") REFERENCES "AiGeneratedExam"(id) ON DELETE CASCADE;

-- Gamification
ALTER TABLE "Achievement" ADD CONSTRAINT fk_achievement_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserXP" ADD CONSTRAINT fk_xp_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserReward" ADD CONSTRAINT fk_reward_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserChallenge" ADD CONSTRAINT fk_challenge_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "ChallengeCompletion" ADD CONSTRAINT fk_challenge_completion_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "ChallengeCompletion" ADD CONSTRAINT fk_challenge_completion_challenge FOREIGN KEY ("challengeId") REFERENCES "Challenge"(id) ON DELETE CASCADE;
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT fk_leaderboard_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT fk_leaderboard_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE CASCADE;

-- Community
ALTER TABLE "ForumPost" ADD CONSTRAINT fk_forum_post_author FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "ForumPost" ADD CONSTRAINT fk_forum_post_category FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE SET NULL;
ALTER TABLE "ForumReply" ADD CONSTRAINT fk_forum_reply_post FOREIGN KEY ("postId") REFERENCES "ForumPost"(id) ON DELETE CASCADE;
ALTER TABLE "ForumReply" ADD CONSTRAINT fk_forum_reply_author FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT fk_announcement_author FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE;

-- Billing & Payments
ALTER TABLE "Subscription" ADD CONSTRAINT fk_subscription_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT fk_subscription_plan FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"(id) ON DELETE SET NULL;
ALTER TABLE "Payment" ADD CONSTRAINT fk_payment_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserWallet" ADD CONSTRAINT fk_wallet_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "GroupSubscription" ADD CONSTRAINT fk_group_sub_owner FOREIGN KEY ("ownerId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "GroupSubscription" ADD CONSTRAINT fk_group_sub_plan FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"(id) ON DELETE SET NULL;

-- Referrals
ALTER TABLE "ReferralReward" ADD CONSTRAINT fk_referral_referrer FOREIGN KEY ("referrerId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT fk_referral_referred FOREIGN KEY ("referredId") REFERENCES "User"(id) ON DELETE SET NULL;

-- Content & Reviews
ALTER TABLE "CourseReview" ADD CONSTRAINT fk_review_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT fk_content_report_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserGrade" ADD CONSTRAINT fk_user_grade_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserGrade" ADD CONSTRAINT fk_user_grade_subject FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;

-- Progress & Tracking
ALTER TABLE "TopicProgress" ADD CONSTRAINT fk_topic_progress_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "CustomGoal" ADD CONSTRAINT fk_custom_goal_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "UserInteraction" ADD CONSTRAINT fk_user_interaction_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "AutomationLog" ADD CONSTRAINT fk_automation_log_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;

-- Teachers
ALTER TABLE "Teacher" ADD CONSTRAINT fk_teacher_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

-- Schedule & Tasks
ALTER TABLE "Task" ADD CONSTRAINT fk_task_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT fk_schedule_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT fk_reminder_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

-- Security
ALTER TABLE "SecurityLog" ADD CONSTRAINT fk_security_log_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE SET NULL;
ALTER TABLE "AuditLog" ADD CONSTRAINT fk_audit_log_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL;

COMMIT;
