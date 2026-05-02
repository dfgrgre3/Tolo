CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_user_created_at_desc ON "User" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_user_role_created_at ON "User" (role, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_user_status_updated_at ON "User" (status, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_user_level ON "User" (level);
CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_email_trgm ON "User" USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_username_trgm ON "User" USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_reset_token_active ON "User" ("resetPasswordToken", "resetPasswordExpires") WHERE "resetPasswordToken" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_magic_token_active ON "User" ("magicLinkToken", "magicLinkExpires") WHERE "magicLinkToken" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_verification_token_active ON "User" ("verificationToken", "verificationExpires") WHERE "verificationToken" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_user_active_expires ON "Session" ("userId", "isActive", "expiresAt");
CREATE INDEX IF NOT EXISTS idx_session_user_active_last_accessed ON "Session" ("userId", "isActive", "lastAccessed");

CREATE INDEX IF NOT EXISTS idx_security_log_event_created ON "SecurityLog" ("eventType", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_security_log_created_desc ON "SecurityLog" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_notification_user_read_created ON "Notification" ("userId", "isRead", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notification_created_desc ON "Notification" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notification_title_trgm ON "Notification" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notification_message_trgm ON "Notification" USING gin (message gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_task_user_created_desc ON "Task" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_task_user_status_created ON "Task" ("userId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_task_status_created ON "Task" (status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_study_session_user_created_desc ON "StudySession" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_study_session_user_start_desc ON "StudySession" ("userId", "startTime" DESC);
CREATE INDEX IF NOT EXISTS idx_study_session_created_desc ON "StudySession" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_study_session_taken_activity ON "StudySession" ("updatedAt", "startTime", "endTime");

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_user_unique ON "Schedule" ("userId");
CREATE INDEX IF NOT EXISTS idx_schedule_user_updated_desc ON "Schedule" ("userId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_user_time ON "Reminder" ("userId", "remindAt");
CREATE INDEX IF NOT EXISTS idx_reminder_active_time ON "Reminder" ("isActive", "remindAt");

CREATE INDEX IF NOT EXISTS idx_subject_public_catalog ON "Subject" ("isPublished", "isActive", level, "categoryId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_subject_featured_public ON "Subject" ("isFeatured", "isPublished", "isActive");
CREATE INDEX IF NOT EXISTS idx_subject_enrolled_desc ON "Subject" ("enrolledCount" DESC);
CREATE INDEX IF NOT EXISTS idx_subject_name_trgm ON "Subject" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_subject_name_ar_trgm ON "Subject" USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_topic_subject_order ON "Topic" ("subjectId", "order");
CREATE INDEX IF NOT EXISTS idx_subtopic_topic_order ON "SubTopic" ("topicId", "order");
CREATE INDEX IF NOT EXISTS idx_attachment_subtopic_created ON "LessonAttachment" ("subTopicId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_enrollment_user_enrolled_desc ON "SubjectEnrollment" ("userId", "enrolledAt" DESC);
CREATE INDEX IF NOT EXISTS idx_enrollment_subject_enrolled_desc ON "SubjectEnrollment" ("subjectId", "enrolledAt" DESC);
CREATE INDEX IF NOT EXISTS idx_topic_progress_user_completed ON "TopicProgress" ("userId", completed);

CREATE INDEX IF NOT EXISTS idx_payment_user_created_desc ON "Payment" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_payment_status_created_desc ON "Payment" (status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_payment_subject_status_created ON "Payment" ("subjectId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_payment_reference_trgm ON "Payment" USING gin (reference gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_invoice_user_created ON "Invoice" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_exam_subject_created ON "Exam" ("subjectId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_exam_title_trgm ON "Exam" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_question_exam ON "Question" ("examId");
CREATE INDEX IF NOT EXISTS idx_exam_result_user_taken_desc ON "ExamResult" ("userId", "takenAt" DESC);
CREATE INDEX IF NOT EXISTS idx_exam_result_exam_taken_desc ON "ExamResult" ("examId", "takenAt" DESC);
CREATE INDEX IF NOT EXISTS idx_exam_result_taken_desc ON "ExamResult" ("takenAt" DESC);

DELETE FROM "UserSettings"
WHERE id NOT IN (
	SELECT MIN(id) FROM "UserSettings" GROUP BY "userId"
);

DELETE FROM "SubjectEnrollment"
WHERE id NOT IN (
	SELECT MIN(id) FROM "SubjectEnrollment" GROUP BY "userId", "subjectId"
);

DELETE FROM "TopicProgress"
WHERE id NOT IN (
	SELECT MIN(id) FROM "TopicProgress" GROUP BY "userId", "subTopicId"
);

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_settings') THEN
		ALTER TABLE "UserSettings" ADD CONSTRAINT unique_user_settings UNIQUE ("userId");
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_subject') THEN
		ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT unique_user_subject UNIQUE ("userId", "subjectId");
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_lesson') THEN
		ALTER TABLE "TopicProgress" ADD CONSTRAINT unique_user_lesson UNIQUE ("userId", "subTopicId");
	END IF;
END $$;
