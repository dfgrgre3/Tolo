-- Migration 0024: Database-level CHECK constraints
-- Prevents invalid data from entering the database at the constraint level

BEGIN;

-- ============================================================
-- User table constraints
-- ============================================================

-- Role must be one of the valid enum values
ALTER TABLE "User" ADD CONSTRAINT chk_user_role
  CHECK ("role" IN ('STUDENT', 'TEACHER', 'MODERATOR', 'ADMIN'));

-- Status must be valid
ALTER TABLE "User" ADD CONSTRAINT chk_user_status
  CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'));

-- Gamification: XP cannot be negative
ALTER TABLE "User" ADD CONSTRAINT chk_user_total_xp
  CHECK ("totalXP" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_level
  CHECK ("level" >= 1);

ALTER TABLE "User" ADD CONSTRAINT chk_user_current_streak
  CHECK ("currentStreak" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_longest_streak
  CHECK ("longestStreak" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_total_study_time
  CHECK ("totalStudyTime" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_tasks_completed
  CHECK ("tasksCompleted" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_exams_passed
  CHECK ("examsPassed" >= 0);

-- Multi-layer XP: all must be non-negative
ALTER TABLE "User" ADD CONSTRAINT chk_user_study_xp
  CHECK ("studyXP" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_task_xp
  CHECK ("taskXP" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_exam_xp
  CHECK ("examXP" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_challenge_xp
  CHECK ("challengeXP" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_quest_xp
  CHECK ("questXP" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_season_xp
  CHECK ("seasonXP" >= 0);

-- Balance and credits cannot be negative
ALTER TABLE "User" ADD CONSTRAINT chk_user_balance
  CHECK ("balance" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_ai_credits
  CHECK ("aiCredits" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_exam_credits
  CHECK ("examCredits" >= 0);

-- Monthly counters cannot be negative
ALTER TABLE "User" ADD CONSTRAINT chk_user_monthly_ai_count
  CHECK ("monthlyAiMessageCount" >= 0);

ALTER TABLE "User" ADD CONSTRAINT chk_user_monthly_exam_count
  CHECK ("monthlyExamCount" >= 0);

-- Focus strategy must be valid
ALTER TABLE "User" ADD CONSTRAINT chk_user_focus_strategy
  CHECK ("focusStrategy" IN ('POMODORO', 'FLOWTIME', 'CUSTOM'));

-- ============================================================
-- Subject table constraints
-- ============================================================

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_price
  CHECK ("price" >= 0);

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_rating
  CHECK ("rating" >= 0 AND "rating" <= 5);

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_enrolled_count
  CHECK ("enrolled_count" >= 0);

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_duration_hours
  CHECK ("duration_hours" >= 0);

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_level
  CHECK ("level" IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED'));

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_language
  CHECK ("language" IN ('ar', 'en', 'fr'));

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_type
  CHECK ("type" IN ('COURSE', 'BOOTCAMP', 'WORKSHOP'));

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_completion_rate
  CHECK ("completion_rate" >= 0 AND "completion_rate" <= 100);

ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_video_count
  CHECK ("video_count" >= 0);

-- ============================================================
-- Topic / SubTopic constraints
-- ============================================================

ALTER TABLE "Topic" ADD CONSTRAINT chk_topic_order
  CHECK ("order" >= 0);

ALTER TABLE "SubTopic" ADD CONSTRAINT chk_subtopic_order
  CHECK ("order" >= 0);

ALTER TABLE "SubTopic" ADD CONSTRAINT chk_subtopic_type
  CHECK ("type" IN ('VIDEO', 'QUIZ', 'ARTICLE', 'ASSIGNMENT'));

ALTER TABLE "SubTopic" ADD CONSTRAINT chk_subtopic_duration
  CHECK ("duration_minutes" >= 0);

-- ============================================================
-- Enrollment constraints
-- ============================================================

ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT chk_enrollment_progress
  CHECK ("progress" >= 0 AND "progress" <= 100);

-- ============================================================
-- Lesson Progress (TopicProgress) constraints
-- ============================================================

ALTER TABLE "TopicProgress" ADD CONSTRAINT chk_progress_status
  CHECK ("status" IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'));

ALTER TABLE "TopicProgress" ADD CONSTRAINT chk_progress_time_spent
  CHECK ("time_spent_seconds" >= 0);

ALTER TABLE "TopicProgress" ADD CONSTRAINT chk_progress_last_position
  CHECK ("last_watched_position" >= 0);

-- ============================================================
-- Exam constraints
-- ============================================================

ALTER TABLE "Exam" ADD CONSTRAINT chk_exam_type
  CHECK ("type" IN ('QUIZ', 'MIDTERM', 'FINAL', 'PRACTICE', 'MOCK'));

ALTER TABLE "Exam" ADD CONSTRAINT chk_exam_difficulty
  CHECK ("difficulty" IN ('easy', 'medium', 'hard')); -- NOSONAR

ALTER TABLE "Exam" ADD CONSTRAINT chk_exam_duration
  CHECK ("duration" > 0);

ALTER TABLE "Exam" ADD CONSTRAINT chk_exam_max_score
  CHECK ("max_score" > 0);

-- ============================================================
-- ExamResult constraints
-- ============================================================

ALTER TABLE "ExamResult" ADD CONSTRAINT chk_exam_result_score
  CHECK ("score" >= 0);

-- ============================================================
-- CourseReview constraints
-- ============================================================

ALTER TABLE "CourseReview" ADD CONSTRAINT chk_review_rating
  CHECK ("rating" >= 1 AND "rating" <= 5);

-- ============================================================
-- WalletTransaction constraints
-- ============================================================

ALTER TABLE "WalletTransaction" ADD CONSTRAINT chk_wallet_tx_type
  CHECK ("type" IN ('DEPOSIT', 'WITHDRAW', 'REFUND', 'AI_USAGE', 'EXAM_USAGE', 'PURCHASE', 'REWARD', 'ADJUSTMENT'));

-- ============================================================
-- Payment constraints
-- ============================================================

ALTER TABLE "Payment" ADD CONSTRAINT chk_payment_amount
  CHECK ("amount" >= 0);

ALTER TABLE "Payment" ADD CONSTRAINT chk_payment_status
  CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));

-- ============================================================
-- Subscription constraints
-- ============================================================

ALTER TABLE "UserSubscription" ADD CONSTRAINT chk_subscription_status
  CHECK ("status" IN ('active', 'cancelled', 'expired', 'past_due', 'trialing'));

ALTER TABLE "UserSubscription" ADD CONSTRAINT chk_subscription_auto_renew
  CHECK ("auto_renew" IN (true, false));

-- ============================================================
-- SubscriptionPlan constraints
-- ============================================================

ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT chk_plan_price
  CHECK ("price" >= 0);

ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT chk_plan_interval
  CHECK ("interval" IN ('monthly', 'yearly', 'quarterly', 'weekly'));

-- ============================================================
-- Notification constraints
-- ============================================================

ALTER TABLE "Notification" ADD CONSTRAINT chk_notification_priority
  CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE "Notification" ADD CONSTRAINT chk_notification_status
  CHECK ("status" IN ('pending', 'sent', 'delivered', 'read', 'failed'));

ALTER TABLE "Notification" ADD CONSTRAINT chk_notification_type
  CHECK ("type" IN ('info', 'warning', 'error', 'success', 'achievement', 'reminder', 'system'));

-- ============================================================
-- Task constraints
-- ============================================================

ALTER TABLE "Task" ADD CONSTRAINT chk_task_status
  CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'ARCHIVED'));

ALTER TABLE "Task" ADD CONSTRAINT chk_task_priority
  CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')); -- NOSONAR

ALTER TABLE "Task" ADD CONSTRAINT chk_task_estimated_time
  CHECK ("estimated_time" >= 0);

ALTER TABLE "Task" ADD CONSTRAINT chk_task_actual_time
  CHECK ("actual_time" >= 0);

-- ============================================================
-- Challenge constraints
-- ============================================================

ALTER TABLE "Challenge" ADD CONSTRAINT chk_challenge_type
  CHECK ("type" IN ('daily', 'weekly', 'monthly', 'once', 'custom'));

ALTER TABLE "Challenge" ADD CONSTRAINT chk_challenge_difficulty
  CHECK ("difficulty" IN ('EASY', 'MEDIUM', 'HARD', 'EXPERT'));

ALTER TABLE "Challenge" ADD CONSTRAINT chk_challenge_xp_reward
  CHECK ("xp_reward" >= 0);

-- ============================================================
-- UserChallenge constraints
-- ============================================================

ALTER TABLE "UserChallenge" ADD CONSTRAINT chk_user_challenge_progress
  CHECK ("progress" >= 0);

-- ============================================================
-- Achievement constraints
-- ============================================================

ALTER TABLE "Achievement" ADD CONSTRAINT chk_achievement_rarity
  CHECK ("rarity" IN ('common', 'uncommon', 'rare', 'epic', 'legendary'));

ALTER TABLE "Achievement" ADD CONSTRAINT chk_achievement_difficulty
  CHECK ("difficulty" IN ('EASY', 'MEDIUM', 'HARD', 'EXPERT'));

ALTER TABLE "Achievement" ADD CONSTRAINT chk_achievement_xp_reward
  CHECK ("xp_reward" >= 0);

ALTER TABLE "Achievement" ADD CONSTRAINT chk_achievement_unlocked_count
  CHECK ("unlocked_count" >= 0);

-- ============================================================
-- Reward constraints
-- ============================================================

ALTER TABLE "Reward" ADD CONSTRAINT chk_reward_cost
  CHECK ("cost" >= 0);

ALTER TABLE "Reward" ADD CONSTRAINT chk_reward_type
  CHECK ("type" IN ('VIRTUAL', 'PHYSICAL', 'DISCOUNT', 'BADGE', 'CREDIT'));

-- ============================================================
-- Season constraints
-- ============================================================

-- End date must be after start date (if both set)
ALTER TABLE "Season" ADD CONSTRAINT chk_season_dates
  CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" > "start_date");

-- ============================================================
-- Coupon constraints
-- ============================================================

ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_discount_type
  CHECK ("discount_type" IN ('percentage', 'fixed'));

ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_discount_value
  CHECK ("discount_value" >= 0);

ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_percentage_max
  CHECK ("discount_type" != 'percentage' OR "discount_value" <= 100);

ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_used_count
  CHECK ("used_count" >= 0);

ALTER TABLE "Coupon" ADD CONSTRAINT chk_coupon_max_uses
  CHECK ("max_uses" IS NULL OR "max_uses" > 0);

-- ============================================================
-- Contest constraints
-- ============================================================

ALTER TABLE "Contest" ADD CONSTRAINT chk_contest_status
  CHECK ("status" IN ('draft', 'active', 'completed', 'cancelled'));

ALTER TABLE "Contest" ADD CONSTRAINT chk_contest_questions_count
  CHECK ("questions_count" > 0);

ALTER TABLE "Contest" ADD CONSTRAINT chk_contest_participants_count
  CHECK ("participants_count" >= 0);

-- ============================================================
-- ContestQuestion constraints
-- ============================================================

ALTER TABLE "ContestQuestion" ADD CONSTRAINT chk_contest_q_duration
  CHECK ("duration" > 0);

ALTER TABLE "ContestQuestion" ADD CONSTRAINT chk_contest_q_points
  CHECK ("points" > 0);

ALTER TABLE "ContestQuestion" ADD CONSTRAINT chk_contest_q_order
  CHECK ("order" >= 0);

-- ============================================================
-- Security / Audit constraints
-- ============================================================

ALTER TABLE "SecurityLog" ADD CONSTRAINT chk_security_event_type
  CHECK ("event_type" IN ('login', 'logout', 'failed_login', 'password_change', '2fa_enabled', '2fa_disabled', 'profile_update', 'suspicious_activity'));

ALTER TABLE "AuditLog" ADD CONSTRAINT chk_audit_action
  CHECK ("action" IN ('create', 'update', 'delete', 'read', 'login', 'logout'));

-- ============================================================
-- BlogPost constraints
-- ============================================================

ALTER TABLE "BlogPost" ADD CONSTRAINT chk_blog_status
  CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));

ALTER TABLE "BlogPost" ADD CONSTRAINT chk_blog_views
  CHECK ("views" >= 0);

-- ============================================================
-- ForumTopic constraints
-- ============================================================

ALTER TABLE "ForumTopic" ADD CONSTRAINT chk_forum_views
  CHECK ("views" >= 0);

-- ============================================================
-- LiveEvent constraints
-- ============================================================

ALTER TABLE "LiveEvent" ADD CONSTRAINT chk_live_event_type
  CHECK ("type" IN ('LIVE', 'WEBINAR', 'WORKSHOP'));

ALTER TABLE "LiveEvent" ADD CONSTRAINT chk_live_event_status
  CHECK ("status" IN ('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED'));

-- ============================================================
-- Event constraints
-- ============================================================

ALTER TABLE "Event" ADD CONSTRAINT chk_event_type
  CHECK ("type" IN ('workshop', 'webinar', 'competition', 'meetup', 'conference'));

ALTER TABLE "Event" ADD CONSTRAINT chk_event_attendees
  CHECK ("attendees_count" >= 0);

ALTER TABLE "Event" ADD CONSTRAINT chk_event_max_attendees
  CHECK ("max_attendees" IS NULL OR "max_attendees" > 0);

-- ============================================================
-- Book constraints
-- ============================================================

ALTER TABLE "Book" ADD CONSTRAINT chk_book_price
  CHECK ("price" >= 0);

ALTER TABLE "Book" ADD CONSTRAINT chk_book_rating
  CHECK ("rating" >= 0 AND "rating" <= 5);

ALTER TABLE "Book" ADD CONSTRAINT chk_book_views
  CHECK ("views" >= 0);

ALTER TABLE "Book" ADD CONSTRAINT chk_book_downloads
  CHECK ("downloads" >= 0);

-- ============================================================
-- SupportTicket constraints
-- ============================================================

ALTER TABLE "SupportTicket" ADD CONSTRAINT chk_ticket_status
  CHECK ("status" IN ('open', 'in_progress', 'resolved', 'closed', 'reopened'));

ALTER TABLE "SupportTicket" ADD CONSTRAINT chk_ticket_priority
  CHECK ("priority" IN ('low', 'medium', 'high', 'critical')); -- NOSONAR

-- ============================================================
-- Broadcast constraints
-- ============================================================

ALTER TABLE "Broadcast" ADD CONSTRAINT chk_broadcast_type
  CHECK ("type" IN ('info', 'warning', 'error', 'success', 'announcement'));

ALTER TABLE "Broadcast" ADD CONSTRAINT chk_broadcast_status
  CHECK ("status" IN ('draft', 'scheduled', 'sent', 'cancelled'));

-- ============================================================
-- PushToken constraints
-- ============================================================

ALTER TABLE "PushToken" ADD CONSTRAINT chk_push_platform
  CHECK ("platform" IN ('web', 'android', 'ios', 'desktop'));

-- ============================================================
-- ContentReport constraints
-- ============================================================

ALTER TABLE "ContentReport" ADD CONSTRAINT chk_report_status
  CHECK ("status" IN ('pending', 'reviewed', 'resolved', 'dismissed'));

-- ============================================================
-- Automation constraints
-- ============================================================

ALTER TABLE "Automation" ADD CONSTRAINT chk_automation_event
  CHECK ("event" IN ('user.registered', 'user.completed_lesson', 'user.passed_exam', 'user.earned_achievement', 'payment.completed', 'subscription.created', 'subscription.expired'));

-- ============================================================
-- Campaign constraints
-- ============================================================

ALTER TABLE "Campaign" ADD CONSTRAINT chk_campaign_type
  CHECK ("type" IN ('email', 'sms', 'push', 'in-app', 'webhook'));

ALTER TABLE "Campaign" ADD CONSTRAINT chk_campaign_status
  CHECK ("status" IN ('draft', 'scheduled', 'running', 'completed', 'cancelled'));

ALTER TABLE "Campaign" ADD CONSTRAINT chk_campaign_target_role
  CHECK ("target_role" IN ('STUDENT', 'TEACHER', 'MODERATOR', 'ADMIN', 'ALL'));

-- ============================================================
-- AIConversation / AIMessage constraints
-- ============================================================

ALTER TABLE "AIMessage" ADD CONSTRAINT chk_ai_message_role
  CHECK ("role" IN ('user', 'assistant', 'system'));

-- ============================================================
-- ScheduledItem constraints
-- ============================================================

ALTER TABLE "ScheduledItem" ADD CONSTRAINT chk_scheduled_type
  CHECK ("type" IN ('announcement', 'exam', 'task', 'post', 'content', 'event', 'reminder'));

ALTER TABLE "ScheduledItem" ADD CONSTRAINT chk_scheduled_status
  CHECK ("status" IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

ALTER TABLE "ScheduledItem" ADD CONSTRAINT chk_scheduled_frequency
  CHECK ("frequency" IN ('once', 'daily', 'weekly', 'monthly', 'yearly'));

-- ============================================================
-- Security audit constraints
-- ============================================================

ALTER TABLE "security_audit_logs" ADD CONSTRAINT chk_security_audit_severity
  CHECK ("severity" IN ('low', 'medium', 'high', 'critical')); -- NOSONAR

ALTER TABLE "security_audit_logs" ADD CONSTRAINT chk_security_audit_status
  CHECK ("status" IN ('open', 'investigating', 'resolved', 'false_positive'));

-- ============================================================
-- IP whitelist constraints
-- ============================================================

ALTER TABLE "ip_whitelist_entries" ADD CONSTRAINT chk_ip_entry_type
  CHECK ("type" IN ('allow', 'block'));

ALTER TABLE "ip_whitelist_entries" ADD CONSTRAINT chk_ip_entry_status
  CHECK ("status" IN ('active', 'inactive', 'expired'));

ALTER TABLE "ip_whitelist_settings" ADD CONSTRAINT chk_ip_default_action
  CHECK ("default_action" IN ('allow', 'block'));

-- ============================================================
-- TwoFactor constraints
-- ============================================================

ALTER TABLE "TwoFactorSettings" ADD CONSTRAINT chk_2fa_method
  CHECK ("method" IN ('totp', 'sms', 'email', 'backup'));

-- ============================================================
-- Backup constraints
-- ============================================================

ALTER TABLE "Backup" ADD CONSTRAINT chk_backup_type
  CHECK ("type" IN ('full', 'incremental', 'differential'));

ALTER TABLE "Backup" ADD CONSTRAINT chk_backup_status
  CHECK ("status" IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

COMMIT;
