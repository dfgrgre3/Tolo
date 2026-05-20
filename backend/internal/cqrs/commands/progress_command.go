package commands

import (
	"thanawy-backend/internal/db"
	"time"

	"gorm.io/gorm"
)

type RecordLessonProgressCommand struct {
	UserID           string
	SubTopicID       string
	TimeSpentSeconds int
	Completed        bool
}

type RecordExamCompletedCommand struct {
	UserID string
	ExamID string
	Score  float64
	Passed bool
}

type RecordTaskCompletedCommand struct {
	UserID string
	TaskID string
}

type RecordStudySessionCommand struct {
	UserID          string
	DurationMinutes int
}

type ProgressCommandService struct {
	writeDB *gorm.DB
}

func NewProgressCommandService() *ProgressCommandService {
	return &ProgressCommandService{writeDB: db.WriteDB()}
}

func (s *ProgressCommandService) RecordLessonCompleted(cmd RecordLessonProgressCommand) error {
	now := time.Now()
	return s.writeDB.Exec(`
		INSERT INTO "TopicProgress" ("id", "userId", "sub_topic_id", "status", "completed", "time_spent_seconds", "last_watched_position", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, 'COMPLETED', true, $3, 0, $4, $4)
		ON CONFLICT ("userId", "sub_topic_id")
		DO UPDATE SET
			"status" = 'COMPLETED',
			"completed" = true,
			"time_spent_seconds" = "TopicProgress"."time_spent_seconds" + EXCLUDED."time_spent_seconds",
			"updated_at" = EXCLUDED."updated_at"
	`, cmd.UserID, cmd.SubTopicID, cmd.TimeSpentSeconds, now).Error
}

func (s *ProgressCommandService) RecordLessonProgress(cmd RecordLessonProgressCommand) error {
	now := time.Now()
	return s.writeDB.Exec(`
		INSERT INTO "TopicProgress" ("id", "userId", "sub_topic_id", "status", "completed", "time_spent_seconds", "last_watched_position", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, 'IN_PROGRESS', false, $3, 0, $4, $4)
		ON CONFLICT ("userId", "sub_topic_id")
		DO UPDATE SET
			"status" = CASE WHEN "TopicProgress"."status" = 'COMPLETED' THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
			"time_spent_seconds" = "TopicProgress"."time_spent_seconds" + EXCLUDED."time_spent_seconds",
			"updated_at" = EXCLUDED."updated_at"
	`, cmd.UserID, cmd.SubTopicID, cmd.TimeSpentSeconds, now).Error
}

func (s *ProgressCommandService) RecordExamCompleted(cmd RecordExamCompletedCommand) error {
	now := time.Now()
	return s.writeDB.Exec(`
		INSERT INTO "ExamResult" ("id", "exam_id", "user_id", "score", "passed", "taken_at", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $5, $5)
	`, cmd.ExamID, cmd.UserID, cmd.Score, cmd.Passed, now).Error
}

func (s *ProgressCommandService) RecordTaskCompleted(cmd RecordTaskCompletedCommand) error {
	result := s.writeDB.Exec(`
		UPDATE "Task" SET "status" = 'DONE', "updated_at" = NOW()
		WHERE "id" = $1 AND "userId" = $2
	`, cmd.TaskID, cmd.UserID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *ProgressCommandService) RecordStudySession(cmd RecordStudySessionCommand) error {
	now := time.Now()
	endTime := now.Add(time.Duration(cmd.DurationMinutes) * time.Minute)
	return s.writeDB.Exec(`
		INSERT INTO "StudySession" ("id", "userId", "duration_min", "start_time", "end_time", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $3, $3)
	`, cmd.UserID, cmd.DurationMinutes, now, endTime).Error
}
