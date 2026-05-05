-- Migration: Safe Naming Fixes
-- Date: 2026-05-04
-- Description: Ensures all core tables use snake_case for CreatedAt, UpdatedAt, DeletedAt and other fields.
-- This migration is idempotent and safe to run multiple times.

BEGIN;

-- Helper function for safe renames
CREATE OR REPLACE FUNCTION safe_rename_column(t_name text, old_col text, new_col text) RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = old_col) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = new_col) THEN
            EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', t_name, old_col, new_col);
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- User table
SELECT safe_rename_column('User', 'createdAt', 'created_at');
SELECT safe_rename_column('User', 'updatedAt', 'updated_at');
SELECT safe_rename_column('User', 'deletedAt', 'deleted_at');
SELECT safe_rename_column('User', 'emailVerified', 'email_verified');
SELECT safe_rename_column('User', 'phoneVerified', 'phone_verified');
SELECT safe_rename_column('User', 'activeSubscriptionId', 'active_subscription_id');
SELECT safe_rename_column('User', 'totalXP', 'total_xp');
SELECT safe_rename_column('User', 'currentStreak', 'current_streak');
SELECT safe_rename_column('User', 'longestStreak', 'longest_streak');
SELECT safe_rename_column('User', 'totalStudyTime', 'total_study_time');
SELECT safe_rename_column('User', 'tasksCompleted', 'tasks_completed');
SELECT safe_rename_column('User', 'examsPassed', 'exams_passed');
SELECT safe_rename_column('User', 'studyXP', 'study_xp');
SELECT safe_rename_column('User', 'taskXP', 'task_xp');
SELECT safe_rename_column('User', 'examXP', 'exam_xp');
SELECT safe_rename_column('User', 'challengeXP', 'challenge_xp');
SELECT safe_rename_column('User', 'questXP', 'quest_xp');
SELECT safe_rename_column('User', 'seasonXP', 'season_xp');
SELECT safe_rename_column('User', 'lastLogin', 'last_login');
SELECT safe_rename_column('User', 'aiCredits', 'ai_credits');
SELECT safe_rename_column('User', 'examCredits', 'exam_credits');
SELECT safe_rename_column('User', 'subscriptionExpiresAt', 'subscription_expires_at');
SELECT safe_rename_column('User', 'resetPasswordToken', 'reset_password_token');
SELECT safe_rename_column('User', 'resetPasswordExpires', 'reset_password_expires');
SELECT safe_rename_column('User', 'magicLinkToken', 'magic_link_token');
SELECT safe_rename_column('User', 'magicLinkExpires', 'magic_link_expires');
SELECT safe_rename_column('User', 'verificationToken', 'verification_token');
SELECT safe_rename_column('User', 'verificationExpires', 'verification_expires');

-- UserSession table
SELECT safe_rename_column('UserSession', 'userId', 'user_id');
SELECT safe_rename_column('UserSession', 'refreshToken', 'refresh_token');
SELECT safe_rename_column('UserSession', 'userAgent', 'user_agent');
SELECT safe_rename_column('UserSession', 'deviceType', 'device_type');
SELECT safe_rename_column('UserSession', 'isActive', 'is_active');
SELECT safe_rename_column('UserSession', 'lastAccessed', 'last_accessed');
SELECT safe_rename_column('UserSession', 'expiresAt', 'expires_at');
SELECT safe_rename_column('UserSession', 'createdAt', 'created_at');
SELECT safe_rename_column('UserSession', 'updatedAt', 'updated_at');
SELECT safe_rename_column('UserSession', 'deletedAt', 'deleted_at');

-- SecurityLog table
SELECT safe_rename_column('SecurityLog', 'userId', 'user_id');
SELECT safe_rename_column('SecurityLog', 'eventType', 'event_type');
SELECT safe_rename_column('SecurityLog', 'userAgent', 'user_agent');
SELECT safe_rename_column('SecurityLog', 'createdAt', 'created_at');
SELECT safe_rename_column('SecurityLog', 'updatedAt', 'updated_at');


-- Subject table
SELECT safe_rename_column('Subject', 'nameAr', 'name_ar');
SELECT safe_rename_column('Subject', 'isActive', 'is_active');
SELECT safe_rename_column('Subject', 'isPublished', 'is_published');
SELECT safe_rename_column('Subject', 'enrolledCount', 'enrolled_count');
SELECT safe_rename_column('Subject', 'thumbnailUrl', 'thumbnail_url');
SELECT safe_rename_column('Subject', 'trailerUrl', 'trailer_url');
SELECT safe_rename_column('Subject', 'trailerDurationMinutes', 'trailer_duration_minutes');
SELECT safe_rename_column('Subject', 'instructorName', 'instructor_name');
SELECT safe_rename_column('Subject', 'instructorId', 'instructor_id');
SELECT safe_rename_column('Subject', 'categoryId', 'category_id');
SELECT safe_rename_column('Subject', 'durationHours', 'duration_hours');
SELECT safe_rename_column('Subject', 'learningObjectives', 'learning_objectives');
SELECT safe_rename_column('Subject', 'seoTitle', 'seo_title');
SELECT safe_rename_column('Subject', 'seoDescription', 'seo_description');
SELECT safe_rename_column('Subject', 'isFeatured', 'is_featured');
SELECT safe_rename_column('Subject', 'coursePrerequisites', 'course_prerequisites');
SELECT safe_rename_column('Subject', 'targetAudience', 'target_audience');
SELECT safe_rename_column('Subject', 'whatYouLearn', 'what_you_learn');
SELECT safe_rename_column('Subject', 'completionRate', 'completion_rate');
SELECT safe_rename_column('Subject', 'videoCount', 'video_count');
SELECT safe_rename_column('Subject', 'lastContentUpdate', 'last_content_update');
SELECT safe_rename_column('Subject', 'createdAt', 'created_at');
SELECT safe_rename_column('Subject', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Subject', 'deletedAt', 'deleted_at');

-- Topic table
SELECT safe_rename_column('Topic', 'subjectId', 'subject_id');
SELECT safe_rename_column('Topic', 'createdAt', 'created_at');
SELECT safe_rename_column('Topic', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Topic', 'deletedAt', 'deleted_at');

-- SubTopic table
SELECT safe_rename_column('SubTopic', 'topicId', 'topic_id');
SELECT safe_rename_column('SubTopic', 'videoUrl', 'video_url');
SELECT safe_rename_column('SubTopic', 'examId', 'exam_id');
SELECT safe_rename_column('SubTopic', 'durationMinutes', 'duration_minutes');
SELECT safe_rename_column('SubTopic', 'isFree', 'is_free');
SELECT safe_rename_column('SubTopic', 'createdAt', 'created_at');
SELECT safe_rename_column('SubTopic', 'updatedAt', 'updated_at');
SELECT safe_rename_column('SubTopic', 'deletedAt', 'deleted_at');

-- Exam table
SELECT safe_rename_column('Exam', 'subjectId', 'subject_id');
SELECT safe_rename_column('Exam', 'isActive', 'is_active');
SELECT safe_rename_column('Exam', 'maxScore', 'max_score');
SELECT safe_rename_column('Exam', 'createdAt', 'created_at');
SELECT safe_rename_column('Exam', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Exam', 'deletedAt', 'deleted_at');

-- Question table
SELECT safe_rename_column('Question', 'examId', 'exam_id');
SELECT safe_rename_column('Question', 'deletedAt', 'deleted_at');

-- ExamResult table
SELECT safe_rename_column('ExamResult', 'examId', 'exam_id');
SELECT safe_rename_column('ExamResult', 'userId', 'user_id');
SELECT safe_rename_column('ExamResult', 'takenAt', 'taken_at');
SELECT safe_rename_column('ExamResult', 'createdAt', 'created_at');
SELECT safe_rename_column('ExamResult', 'updatedAt', 'updated_at');
SELECT safe_rename_column('ExamResult', 'deletedAt', 'deleted_at');

-- SubjectEnrollment table
SELECT safe_rename_column('SubjectEnrollment', 'userId', 'user_id');
SELECT safe_rename_column('SubjectEnrollment', 'subjectId', 'subject_id');
SELECT safe_rename_column('SubjectEnrollment', 'enrolledAt', 'enrolled_at');
SELECT safe_rename_column('SubjectEnrollment', 'createdAt', 'created_at');
SELECT safe_rename_column('SubjectEnrollment', 'updatedAt', 'updated_at');
SELECT safe_rename_column('SubjectEnrollment', 'deletedAt', 'deleted_at');

-- TopicProgress table
SELECT safe_rename_column('TopicProgress', 'userId', 'user_id');
SELECT safe_rename_column('TopicProgress', 'subTopicId', 'sub_topic_id');
SELECT safe_rename_column('TopicProgress', 'isCompleted', 'is_completed');
SELECT safe_rename_column('TopicProgress', 'completedAt', 'completed_at');
SELECT safe_rename_column('TopicProgress', 'lastAccessedAt', 'last_accessed_at');
SELECT safe_rename_column('TopicProgress', 'lastWatchedPosition', 'last_watched_position');
SELECT safe_rename_column('TopicProgress', 'timeSpentSeconds', 'time_spent_seconds');
SELECT safe_rename_column('TopicProgress', 'createdAt', 'created_at');
SELECT safe_rename_column('TopicProgress', 'updatedAt', 'updated_at');
SELECT safe_rename_column('TopicProgress', 'deletedAt', 'deleted_at');

-- Payment table
SELECT safe_rename_column('Payment', 'userId', 'user_id');
SELECT safe_rename_column('Payment', 'subjectId', 'subject_id');
SELECT safe_rename_column('Payment', 'planId', 'plan_id');
SELECT safe_rename_column('Payment', 'paymobOrderId', 'paymob_order_id');
SELECT safe_rename_column('Payment', 'externalTxnId', 'external_txn_id');
SELECT safe_rename_column('Payment', 'completedAt', 'completed_at');
SELECT safe_rename_column('Payment', 'createdAt', 'created_at');
SELECT safe_rename_column('Payment', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Payment', 'deletedAt', 'deleted_at');

-- Invoice table
SELECT safe_rename_column('Invoice', 'paymentId', 'payment_id');
SELECT safe_rename_column('Invoice', 'userId', 'user_id');
SELECT safe_rename_column('Invoice', 'invoiceNumber', 'invoice_number');
SELECT safe_rename_column('Invoice', 'pdfUrl', 'pdf_url');
SELECT safe_rename_column('Invoice', 'createdAt', 'created_at');
SELECT safe_rename_column('Invoice', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Invoice', 'deletedAt', 'deleted_at');

-- WalletTransaction table
SELECT safe_rename_column('WalletTransaction', 'userId', 'user_id');
SELECT safe_rename_column('WalletTransaction', 'walletType', 'wallet_type');
SELECT safe_rename_column('WalletTransaction', 'referenceId', 'reference_id');
SELECT safe_rename_column('WalletTransaction', 'createdAt', 'created_at');
SELECT safe_rename_column('WalletTransaction', 'deletedAt', 'deleted_at');

-- UserAchievement table
SELECT safe_rename_column('UserAchievement', 'userId', 'user_id');
SELECT safe_rename_column('UserAchievement', 'achievementId', 'achievement_id');
SELECT safe_rename_column('UserAchievement', 'unlockedAt', 'unlocked_at');
SELECT safe_rename_column('UserAchievement', 'createdAt', 'created_at');
SELECT safe_rename_column('UserAchievement', 'updatedAt', 'updated_at');
SELECT safe_rename_column('UserAchievement', 'deletedAt', 'deleted_at');

-- UserChallenge table
SELECT safe_rename_column('UserChallenge', 'userId', 'user_id');
SELECT safe_rename_column('UserChallenge', 'challengeId', 'challenge_id');
SELECT safe_rename_column('UserChallenge', 'isCompleted', 'is_completed');
SELECT safe_rename_column('UserChallenge', 'completedAt', 'completed_at');
SELECT safe_rename_column('UserChallenge', 'createdAt', 'created_at');
SELECT safe_rename_column('UserChallenge', 'updatedAt', 'updated_at');
SELECT safe_rename_column('UserChallenge', 'deletedAt', 'deleted_at');

-- Challenge table
SELECT safe_rename_column('Challenge', 'subjectId', 'subject_id');
SELECT safe_rename_column('Challenge', 'xpReward', 'xp_reward');
SELECT safe_rename_column('Challenge', 'isActive', 'is_active');
SELECT safe_rename_column('Challenge', 'startDate', 'start_date');
SELECT safe_rename_column('Challenge', 'endDate', 'end_date');
SELECT safe_rename_column('Challenge', 'createdAt', 'created_at');
SELECT safe_rename_column('Challenge', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Challenge', 'deletedAt', 'deleted_at');

-- Achievement table
SELECT safe_rename_column('Achievement', 'xpReward', 'xp_reward');
SELECT safe_rename_column('Achievement', 'isSecret', 'is_secret');
SELECT safe_rename_column('Achievement', 'unlockedCount', 'unlocked_count');
SELECT safe_rename_column('Achievement', 'createdAt', 'created_at');
SELECT safe_rename_column('Achievement', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Achievement', 'deletedAt', 'deleted_at');

-- Coupon table
SELECT safe_rename_column('Coupon', 'discountValue', 'discount_value');
SELECT safe_rename_column('Coupon', 'discountType', 'discount_type');
SELECT safe_rename_column('Coupon', 'maxUses', 'max_uses');
SELECT safe_rename_column('Coupon', 'usedCount', 'used_count');
SELECT safe_rename_column('Coupon', 'isActive', 'is_active');
SELECT safe_rename_column('Coupon', 'expiresAt', 'expires_at');
SELECT safe_rename_column('Coupon', 'createdAt', 'created_at');
SELECT safe_rename_column('Coupon', 'updatedAt', 'updated_at');
SELECT safe_rename_column('Coupon', 'deletedAt', 'deleted_at');

-- Task table (extra columns)
SELECT safe_rename_column('Task', 'estimatedTime', 'estimated_time');
SELECT safe_rename_column('Task', 'actualTime', 'actual_time');
SELECT safe_rename_column('Task', 'dueAt', 'due_at');
SELECT safe_rename_column('Task', 'completedAt', 'completed_at');

-- StudySession table (extra columns)
SELECT safe_rename_column('StudySession', 'startTime', 'start_time');
SELECT safe_rename_column('StudySession', 'endTime', 'end_time');
SELECT safe_rename_column('StudySession', 'durationMin', 'duration_min');
SELECT safe_rename_column('StudySession', 'focusScore', 'focus_score');

-- Clean up
DROP FUNCTION safe_rename_column(text, text, text);


COMMIT;
