UPDATE "User"
SET
	balance = GREATEST(balance, 0),
	"aiCredits" = GREATEST("aiCredits", 0),
	"examCredits" = GREATEST("examCredits", 0),
	"totalXP" = GREATEST("totalXP", 0),
	level = GREATEST(level, 1);

UPDATE "Subject"
SET
	price = GREATEST(price, 0),
	rating = LEAST(GREATEST(rating, 0), 5),
	"enrolledCount" = GREATEST("enrolledCount", 0),
	"durationHours" = GREATEST("durationHours", 0),
	"videoCount" = GREATEST("videoCount", 0),
	"completionRate" = LEAST(GREATEST("completionRate", 0), 100);

UPDATE "CourseReview"
SET rating = LEAST(GREATEST(rating, 1), 5);

UPDATE "Payment"
SET amount = GREATEST(amount, 0);

UPDATE "StudySession"
SET
	"durationMin" = GREATEST("durationMin", 0),
	"focusScore" = LEAST(GREATEST("focusScore", 0), 100);

UPDATE "Task"
SET
	"estimatedTime" = GREATEST("estimatedTime", 0),
	"actualTime" = GREATEST("actualTime", 0);

DELETE FROM "CourseReview"
WHERE id NOT IN (
	SELECT MIN(id) FROM "CourseReview" GROUP BY "userId", "subjectId"
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_review_user_subject_unique ON "CourseReview" ("userId", "subjectId");
CREATE INDEX IF NOT EXISTS idx_session_refresh_token_active ON "Session" ("refreshToken") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_payment_completed_subject_user ON "Payment" ("userId", "subjectId", status) WHERE status = 'COMPLETED';

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_balance_nonnegative') THEN
		ALTER TABLE "User" ADD CONSTRAINT chk_user_balance_nonnegative CHECK (balance >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_ai_credits_nonnegative') THEN
		ALTER TABLE "User" ADD CONSTRAINT chk_user_ai_credits_nonnegative CHECK ("aiCredits" >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_exam_credits_nonnegative') THEN
		ALTER TABLE "User" ADD CONSTRAINT chk_user_exam_credits_nonnegative CHECK ("examCredits" >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_level_positive') THEN
		ALTER TABLE "User" ADD CONSTRAINT chk_user_level_positive CHECK (level >= 1);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_total_xp_nonnegative') THEN
		ALTER TABLE "User" ADD CONSTRAINT chk_user_total_xp_nonnegative CHECK ("totalXP" >= 0);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subject_price_nonnegative') THEN
		ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_price_nonnegative CHECK (price >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subject_rating_range') THEN
		ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_rating_range CHECK (rating >= 0 AND rating <= 5);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subject_enrolled_count_nonnegative') THEN
		ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_enrolled_count_nonnegative CHECK ("enrolledCount" >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subject_completion_rate_range') THEN
		ALTER TABLE "Subject" ADD CONSTRAINT chk_subject_completion_rate_range CHECK ("completionRate" >= 0 AND "completionRate" <= 100);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_amount_nonnegative') THEN
		ALTER TABLE "Payment" ADD CONSTRAINT chk_payment_amount_nonnegative CHECK (amount >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_course_review_rating_range') THEN
		ALTER TABLE "CourseReview" ADD CONSTRAINT chk_course_review_rating_range CHECK (rating >= 1 AND rating <= 5);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_study_session_duration_nonnegative') THEN
		ALTER TABLE "StudySession" ADD CONSTRAINT chk_study_session_duration_nonnegative CHECK ("durationMin" >= 0);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_study_session_focus_score_range') THEN
		ALTER TABLE "StudySession" ADD CONSTRAINT chk_study_session_focus_score_range CHECK ("focusScore" >= 0 AND "focusScore" <= 100);
	END IF;
END $$;
