-- Migration 0026: Performance and integrity indexes
-- Covers the most common query patterns

BEGIN;

-- ============================================================
-- User: common lookup patterns
-- ============================================================

-- Role + Status composite (admin dashboards)
CREATE INDEX IF NOT EXISTS idx_user_role_status ON "User" ("role", "status");

-- Last login for active user queries
CREATE INDEX IF NOT EXISTS idx_user_last_login ON "User" ("lastLogin") WHERE "lastLogin" IS NOT NULL;

-- Email verification pending
CREATE INDEX IF NOT EXISTS idx_user_email_verify_pending ON "User" ("emailVerified", "email_verification_expires")
  WHERE "emailVerified" = false;

-- Subscription expiry monitoring
CREATE INDEX IF NOT EXISTS idx_user_subscription_expires ON "User" ("subscriptionExpiresAt")
  WHERE "subscriptionExpiresAt" IS NOT NULL;

-- Leaderboard queries (top XP users)
CREATE INDEX IF NOT EXISTS idx_user_total_xp_desc ON "User" ("totalXP" DESC);

-- Streak tracking
CREATE INDEX IF NOT EXISTS idx_user_streak ON "User" ("currentStreak" DESC, "longestStreak" DESC);

-- ============================================================
-- Subject: search and filtering
-- ============================================================

-- Published + active subjects (main listing)
CREATE INDEX IF NOT EXISTS idx_subject_published_active ON "Subject" ("isPublished", "isActive");

-- Category + level filtering
CREATE INDEX IF NOT EXISTS idx_subject_category_level ON "Subject" ("categoryId", "level")
  WHERE "categoryId" IS NOT NULL;

-- Featured subjects
CREATE INDEX IF NOT EXISTS idx_subject_featured ON "Subject" ("isFeatured") WHERE "isFeatured" = true;

-- Instructor's subjects
CREATE INDEX IF NOT EXISTS idx_subject_instructor ON "Subject" ("instructor_id")
  WHERE "instructor_id" IS NOT NULL;

-- Price range queries
CREATE INDEX IF NOT EXISTS idx_subject_price_range ON "Subject" ("price");

-- Rating for sorting
CREATE INDEX IF NOT EXISTS idx_subject_rating_desc ON "Subject" ("rating" DESC);

-- Trigram index for full-text search on name
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_subject_name_trgm ON "Subject" USING gin ("name" gin_trgm_ops);

-- ============================================================
-- Enrollment: user's courses, subject's students
-- ============================================================

-- User's enrollments with progress
CREATE INDEX IF NOT EXISTS idx_enrollment_user_progress ON "SubjectEnrollment" ("userId", "progress");

-- Subject enrollment count
CREATE INDEX IF NOT EXISTS idx_enrollment_subject ON "SubjectEnrollment" ("subjectId");

-- Recent enrollments
CREATE INDEX IF NOT EXISTS idx_enrollment_recent ON "SubjectEnrollment" ("enrolledAt" DESC);

-- ============================================================
-- LessonProgress: user's learning path
-- ============================================================

-- User's progress across all lessons
CREATE INDEX IF NOT EXISTS idx_progress_user_status ON "TopicProgress" ("userId", "status");

-- Completed lessons count per user
CREATE INDEX IF NOT EXISTS idx_progress_user_completed ON "TopicProgress" ("userId") WHERE "completed" = true;

-- Time tracking
CREATE INDEX IF NOT EXISTS idx_progress_time_spent ON "TopicProgress" ("userId", "time_spent_seconds");

-- ============================================================
-- Exam: subject's exams
-- ============================================================

-- Exams by subject + type
CREATE INDEX IF NOT EXISTS idx_exam_subject_type ON "Exam" ("subjectId", "type");

-- Active exams only
CREATE INDEX IF NOT EXISTS idx_exam_active ON "Exam" ("isActive") WHERE "isActive" = true;

-- ============================================================
-- ExamResult: user's exam history
-- ============================================================

-- User's exam results (already has composite index, add taken_at desc)
CREATE INDEX IF NOT EXISTS idx_exam_result_user_taken ON "ExamResult" ("user_id", "taken_at" DESC);

-- Exam's results
CREATE INDEX IF NOT EXISTS idx_exam_result_exam ON "ExamResult" ("exam_id");

-- Passed results for statistics
CREATE INDEX IF NOT EXISTS idx_exam_result_passed ON "ExamResult" ("passed");

-- Recent results
CREATE INDEX IF NOT EXISTS idx_exam_result_recent ON "ExamResult" ("taken_at" DESC);

-- ============================================================
-- CourseReview: subject reviews
-- ============================================================

-- Reviews by subject + visibility
CREATE INDEX IF NOT EXISTS idx_review_subject_visible ON "CourseReview" ("subjectId", "isVisible")
  WHERE "isVisible" = true;

-- Reviews by rating
CREATE INDEX IF NOT EXISTS idx_review_rating ON "CourseReview" ("rating" DESC);

-- Recent reviews
CREATE INDEX IF NOT EXISTS idx_review_recent ON "CourseReview" ("createdAt" DESC);

-- ============================================================
-- Notification: user's notifications
-- ============================================================

-- Unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notification_user_unread ON "Notification" ("userId", "is_read")
  WHERE "is_read" = false;

-- Notifications by type
CREATE INDEX IF NOT EXISTS idx_notification_type ON "Notification" ("type");

-- Notifications by status
CREATE INDEX IF NOT EXISTS idx_notification_status ON "Notification" ("status");

-- Recent notifications
CREATE INDEX IF NOT EXISTS idx_notification_recent ON "Notification" ("userId", "createdAt" DESC);

-- ============================================================
-- Task: user's tasks
-- ============================================================

-- Tasks by user + status
CREATE INDEX IF NOT EXISTS idx_task_user_status ON "Task" ("userId", "status");

-- Tasks by user + priority
CREATE INDEX IF NOT EXISTS idx_task_user_priority ON "Task" ("userId", "priority");

-- Due date tracking
CREATE INDEX IF NOT EXISTS idx_task_due ON "Task" ("due_at") WHERE "due_at" IS NOT NULL;

-- Overdue tasks
CREATE INDEX IF NOT EXISTS idx_task_overdue ON "Task" ("due_at", "status")
  WHERE "due_at" < NOW() AND "status" NOT IN ('DONE', 'CANCELLED', 'ARCHIVED');

-- ============================================================
-- StudySession: user's study history
-- ============================================================

-- Sessions by user + date range
CREATE INDEX IF NOT EXISTS idx_session_user_time ON "StudySession" ("userId", "start_time", "end_time");

-- Subject-based sessions
CREATE INDEX IF NOT EXISTS idx_session_subject ON "StudySession" ("subject_id")
  WHERE "subject_id" IS NOT NULL;

-- ============================================================
-- WalletTransaction: user's financial history
-- ============================================================

-- Transactions by user + type
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_type ON "WalletTransaction" ("userId", "type");

-- Recent transactions
CREATE INDEX IF NOT EXISTS idx_wallet_tx_recent ON "WalletTransaction" ("userId", "createdAt" DESC);

-- ============================================================
-- Payment: user's payment history
-- ============================================================

-- Payments by user + status
CREATE INDEX IF NOT EXISTS idx_payment_user_status ON "Payment" ("userId", "status");

-- Recent payments
CREATE INDEX IF NOT EXISTS idx_payment_recent ON "Payment" ("userId", "createdAt" DESC);

-- ============================================================
-- SecurityLog: user's security events
-- ============================================================

-- Security events by user + type
CREATE INDEX IF NOT EXISTS idx_security_log_user_event ON "SecurityLog" ("user_id", "event_type");

-- Recent security events
CREATE INDEX IF NOT EXISTS idx_security_log_recent ON "SecurityLog" ("user_id", "createdAt" DESC);

-- Failed login attempts
CREATE INDEX IF NOT EXISTS idx_security_log_failed_login ON "SecurityLog" ("event_type", "createdAt" DESC)
  WHERE "event_type" = 'failed_login';

-- ============================================================
-- AuditLog: resource tracking
-- ============================================================

-- Audit by user + action
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON "AuditLog" ("userId", "action");

-- Audit by resource
CREATE INDEX IF NOT EXISTS idx_audit_resource ON "AuditLog" ("resource", "resource_id");

-- Recent audit entries
CREATE INDEX IF NOT EXISTS idx_audit_recent ON "AuditLog" ("createdAt" DESC);

-- ============================================================
-- AIConversation: user's AI history
-- ============================================================

-- Active conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversation_active ON "AIConversation" ("userId", "is_active")
  WHERE "is_active" = true;

-- ============================================================
-- UserSession: active sessions
-- ============================================================

-- Active sessions by user
CREATE INDEX IF NOT EXISTS idx_session_user_status ON "UserSession" ("userId", "status")
  WHERE "status" = 'active';

-- Expired sessions for cleanup
CREATE INDEX IF NOT EXISTS idx_session_expired ON "UserSession" ("expires_at")
  WHERE "expires_at" < NOW();

-- Refresh token lookup (already unique, but add for completeness)
CREATE INDEX IF NOT EXISTS idx_session_refresh_token ON "UserSession" ("refresh_token")
  WHERE "refresh_token" IS NOT NULL;

-- ============================================================
-- Challenge: active challenges
-- ============================================================

-- Active challenges by type
CREATE INDEX IF NOT EXISTS idx_challenge_active_type ON "Challenge" ("isActive", "type")
  WHERE "isActive" = true;

-- Challenges by subject
CREATE INDEX IF NOT EXISTS idx_challenge_subject ON "Challenge" ("subject_id")
  WHERE "subject_id" IS NOT NULL;

-- ============================================================
-- UserAchievement: user's achievements
-- ============================================================

-- User's achievements with unlock date
CREATE INDEX IF NOT EXISTS idx_user_achievement_user_unlocked ON "UserAchievement" ("userId", "unlocked_at" DESC);

-- ============================================================
-- UserChallenge: user's challenge progress
-- ============================================================

-- User's active challenges
CREATE INDEX IF NOT EXISTS idx_user_challenge_user_active ON "UserChallenge" ("userId", "is_completed")
  WHERE "is_completed" = false;

-- ============================================================
-- BlogPost: content discovery
-- ============================================================

-- Published posts
CREATE INDEX IF NOT EXISTS idx_blog_published ON "BlogPost" ("status", "published_at" DESC)
  WHERE "status" = 'PUBLISHED';

-- Posts by author
CREATE INDEX IF NOT EXISTS idx_blog_author ON "BlogPost" ("author_id");

-- Posts by category
CREATE INDEX IF NOT EXISTS idx_blog_category ON "BlogPost" ("categoryId");

-- Trigram index for title search
CREATE INDEX IF NOT EXISTS idx_blog_title_trgm ON "BlogPost" USING gin ("title" gin_trgm_ops);

-- ============================================================
-- ForumTopic: forum browsing
-- ============================================================

-- Topics by category + pinned
CREATE INDEX IF NOT EXISTS idx_forum_category_pinned ON "ForumTopic" ("categoryId", "is_pinned" DESC);

-- Popular topics
CREATE INDEX IF NOT EXISTS idx_forum_popular ON "ForumTopic" ("views" DESC);

-- ============================================================
-- SupportTicket: ticket management
-- ============================================================

-- Open tickets by priority
CREATE INDEX IF NOT EXISTS idx_ticket_open_priority ON "SupportTicket" ("status", "priority")
  WHERE "status" IN ('open', 'in_progress');

-- User's tickets
CREATE INDEX IF NOT EXISTS idx_ticket_user ON "SupportTicket" ("userId");

-- ============================================================
-- Coupon: active coupons
-- ============================================================

-- Active, non-expired coupons
CREATE INDEX IF NOT EXISTS idx_coupon_active ON "Coupon" ("is_active", "expiry_date")
  WHERE "is_active" = true;

-- ============================================================
-- Broadcast: broadcast management
-- ============================================================

-- Scheduled broadcasts
CREATE INDEX IF NOT EXISTS idx_broadcast_scheduled ON "Broadcast" ("status", "scheduled_for")
  WHERE "status" = 'scheduled';

-- ============================================================
-- PushToken: active tokens
-- ============================================================

-- Active tokens by platform
CREATE INDEX IF NOT EXISTS idx_push_token_active_platform ON "PushToken" ("platform", "is_active")
  WHERE "is_active" = true;

-- ============================================================
-- ContentReport: pending reports
-- ============================================================

-- Pending reports
CREATE INDEX IF NOT EXISTS idx_report_pending ON "ContentReport" ("status")
  WHERE "status" = 'pending';

-- ============================================================
-- AutomationLog: automation tracking
-- ============================================================

-- Automation logs by event
CREATE INDEX IF NOT EXISTS idx_automation_event ON "AutomationLog" ("event");

-- Recent automation logs
CREATE INDEX IF NOT EXISTS idx_automation_recent ON "AutomationLog" ("createdAt" DESC);

-- ============================================================
-- ScheduledItem: pending scheduled items
-- ============================================================

-- Pending items due soon
CREATE INDEX IF NOT EXISTS idx_scheduled_pending ON "ScheduledItem" ("status", "scheduled_for")
  WHERE "status" = 'pending';

-- ============================================================
-- Security audit logs
-- ============================================================

-- High severity events
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON "security_audit_logs" ("severity", "status")
  WHERE "severity" IN ('high', 'critical');

-- Recent security audit
CREATE INDEX IF NOT EXISTS idx_security_audit_recent ON "security_audit_logs" ("createdAt" DESC);

-- ============================================================
-- Blocked IP attempts
-- ============================================================

-- High-frequency blocked IPs
CREATE INDEX IF NOT EXISTS idx_blocked_ip_count ON "blocked_ip_attempts" ("count" DESC);

-- Recent blocked attempts
CREATE INDEX IF NOT EXISTS idx_blocked_ip_recent ON "blocked_ip_attempts" ("createdAt" DESC);

-- ============================================================
-- LeaderboardEntry: leaderboard queries
-- ============================================================

-- Leaderboard by type + period
CREATE INDEX IF NOT EXISTS idx_leaderboard_type_period ON "LeaderboardEntry" ("type", "period", "rank");

-- ============================================================
-- SeasonParticipation: season rankings
-- ============================================================

-- Season rankings
CREATE INDEX IF NOT EXISTS idx_season_participation_rank ON "SeasonParticipation" ("seasonId", "rank")
  WHERE "seasonId" IS NOT NULL;

-- ============================================================
-- ProgressSnapshot: daily progress tracking
-- ============================================================

-- User's daily snapshots
CREATE INDEX IF NOT EXISTS idx_progress_snapshot_user_date ON "ProgressSnapshot" ("userId", "date" DESC);

-- ============================================================
-- UserActivity: activity tracking
-- ============================================================

-- Active users by streak
CREATE INDEX IF NOT EXISTS idx_user_activity_streak ON "UserActivity" ("currentStreak" DESC)
  WHERE "currentStreak" > 0;

COMMIT;
