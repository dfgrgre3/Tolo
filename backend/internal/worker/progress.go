package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"thanawy-backend/internal/db"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"
)

// writeDB returns the write-routed DB connection for CQRS write path.
func writeDB() *gorm.DB {
	return db.WriteDB()
}

const (
	TypeProgressUpdate = "progress:update"
	TypeGamificationSync = "gamification:sync"
	TypeBatchProgressFlush = "progress:batch_flush"
)

type ProgressUpdatePayload struct {
	UserID              string `json:"userId"`
	SubTopicID          string `json:"subTopicId,omitempty"`
	EventType           string `json:"eventType"`
	TimeSpentSeconds    int    `json:"timeSpentSeconds,omitempty"`
	Completed           bool   `json:"completed,omitempty"`
	ExamID              string `json:"examId,omitempty"`
	ExamScore           float64 `json:"examScore,omitempty"`
	ExamPassed          bool   `json:"examPassed,omitempty"`
	TaskID              string `json:"taskId,omitempty"`
	TaskCompleted       bool   `json:"taskCompleted,omitempty"`
	StudySessionMinutes int    `json:"studySessionMinutes,omitempty"`
}

type GamificationSyncPayload struct {
	UserID    string `json:"userId"`
	XPType    string `json:"xpType"`
	XPAmount  int    `json:"xpAmount"`
	Source    string `json:"source"`
	SourceID  string `json:"sourceId,omitempty"`
}

type BatchProgressFlushPayload struct {
	UserID string `json:"userId"`
}

func NewProgressUpdateTask(payload ProgressUpdatePayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeProgressUpdate, data), nil
}

func NewGamificationSyncTask(payload GamificationSyncPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeGamificationSync, data), nil
}

func NewBatchProgressFlushTask(payload BatchProgressFlushPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TypeBatchProgressFlush, data), nil
}

type ProgressHandler struct{}

func (h *ProgressHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p ProgressUpdatePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	log.Printf("[ProgressWorker] Processing progress update for user %s: %s", p.UserID, p.EventType)

	switch p.EventType {
	case "lesson_completed":
		return h.handleLessonCompleted(ctx, p)
	case "lesson_progress":
		return h.handleLessonProgress(ctx, p)
	case "exam_completed":
		return h.handleExamCompleted(ctx, p)
	case "task_completed":
		return h.handleTaskCompleted(ctx, p)
	case "study_session":
		return h.handleStudySession(ctx, p)
	default:
		return fmt.Errorf("unknown progress event type: %s", p.EventType)
	}
}

func (h *ProgressHandler) handleLessonCompleted(ctx context.Context, p ProgressUpdatePayload) error {
	if writeDB() == nil {
		return fmt.Errorf("database not connected")
	}

	now := time.Now()

	result := writeDB().Exec(`
		INSERT INTO "TopicProgress" ("id", "userId", "sub_topic_id", "status", "completed", "time_spent_seconds", "last_watched_position", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, 'COMPLETED', true, $3, 0, $4, $4)
		ON CONFLICT ("userId", "sub_topic_id")
		DO UPDATE SET
			"status" = 'COMPLETED',
			"completed" = true,
			"time_spent_seconds" = "TopicProgress"."time_spent_seconds" + EXCLUDED."time_spent_seconds",
			"updated_at" = EXCLUDED."updated_at"
	`, p.UserID, p.SubTopicID, p.TimeSpentSeconds, now)

	if result.Error != nil {
		return fmt.Errorf("update lesson progress: %w", result.Error)
	}

	log.Printf("[ProgressWorker] Lesson completed: user=%s sub_topic=%s", p.UserID, p.SubTopicID)
	return nil
}

func (h *ProgressHandler) handleLessonProgress(ctx context.Context, p ProgressUpdatePayload) error {
	if writeDB() == nil {
		return fmt.Errorf("database not connected")
	}

	now := time.Now()

	result := writeDB().Exec(`
		INSERT INTO "TopicProgress" ("id", "userId", "sub_topic_id", "status", "completed", "time_spent_seconds", "last_watched_position", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, 'IN_PROGRESS', false, $3, 0, $4, $4)
		ON CONFLICT ("userId", "sub_topic_id")
		DO UPDATE SET
			"status" = CASE WHEN "TopicProgress"."status" = 'COMPLETED' THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
			"time_spent_seconds" = "TopicProgress"."time_spent_seconds" + EXCLUDED."time_spent_seconds",
			"updated_at" = EXCLUDED."updated_at"
	`, p.UserID, p.SubTopicID, p.TimeSpentSeconds, now)

	if result.Error != nil {
		return fmt.Errorf("update lesson progress: %w", result.Error)
	}

	return nil
}

func (h *ProgressHandler) handleExamCompleted(ctx context.Context, p ProgressUpdatePayload) error {
	if writeDB() == nil {
		return fmt.Errorf("database not connected")
	}

	now := time.Now()

	result := writeDB().Exec(`
		INSERT INTO "ExamResult" ("id", "exam_id", "user_id", "score", "passed", "taken_at", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $5, $5)
	`, p.ExamID, p.UserID, p.ExamScore, p.ExamPassed, now)

	if result.Error != nil {
		return fmt.Errorf("insert exam result: %w", result.Error)
	}

	log.Printf("[ProgressWorker] Exam completed: user=%s exam=%s score=%.1f passed=%t",
		p.UserID, p.ExamID, p.ExamScore, p.ExamPassed)
	return nil
}

func (h *ProgressHandler) handleTaskCompleted(ctx context.Context, p ProgressUpdatePayload) error {
	if db.DB == nil {
		return fmt.Errorf("database not connected")
	}

	result := writeDB().Exec(`
		UPDATE "Task" SET "status" = 'DONE', "updated_at" = NOW()
		WHERE "id" = $1 AND "userId" = $2
	`, p.TaskID, p.UserID)

	if result.Error != nil {
		return fmt.Errorf("update task: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("task not found: %s", p.TaskID)
	}

	return nil
}

func (h *ProgressHandler) handleStudySession(ctx context.Context, p ProgressUpdatePayload) error {
	if writeDB() == nil {
		return fmt.Errorf("database not connected")
	}

	now := time.Now()
	endTime := now.Add(time.Duration(p.StudySessionMinutes) * time.Minute)

	result := writeDB().Exec(`
		INSERT INTO "StudySession" ("id", "userId", "duration_min", "start_time", "end_time", "created_at", "updated_at")
		VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $3, $3)
	`, p.UserID, p.StudySessionMinutes, now, endTime)

	if result.Error != nil {
		return fmt.Errorf("insert study session: %w", result.Error)
	}

	return nil
}

type GamificationHandler struct{}

func (h *GamificationHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p GamificationSyncPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	log.Printf("[GamificationWorker] Syncing gamification for user %s: +%d %s XP (%s)",
		p.UserID, p.XPAmount, p.XPType, p.Source)

	if writeDB() == nil {
		return fmt.Errorf("database not connected")
	}

	var updateColumn string
	switch p.XPType {
	case "study":
		updateColumn = `"studyXP"`
	case "task":
		updateColumn = `"taskXP"`
	case "exam":
		updateColumn = `"examXP"`
	case "challenge":
		updateColumn = `"challengeXP"`
	case "quest":
		updateColumn = `"questXP"`
	case "season":
		updateColumn = `"seasonXP"`
	default:
		updateColumn = `"totalXP"`
	}

	result := writeDB().Exec(fmt.Sprintf(`
		UPDATE "User" SET
			"totalXP" = "totalXP" + $1,
			%s = %s + $1,
			"level" = FLOOR((("totalXP" + $1) / 100)) + 1,
			"updatedAt" = NOW()
		WHERE "id" = $2
	`, updateColumn, updateColumn), p.XPAmount, p.UserID)

	if result.Error != nil {
		return fmt.Errorf("update user XP: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found: %s", p.UserID)
	}

	log.Printf("[GamificationWorker] XP synced: user=%s +%d %s XP (source: %s)",
		p.UserID, p.XPAmount, p.XPType, p.Source)
	return nil
}

type BatchProgressFlushHandler struct{}

func (h *BatchProgressFlushHandler) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var p BatchProgressFlushPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	log.Printf("[BatchFlushWorker] Flushing aggregated progress for user %s", p.UserID)

	if writeDB() == nil {
		return fmt.Errorf("database not connected")
	}

	result := writeDB().Exec(`
		UPDATE "User" SET
			"totalStudyTime" = "totalStudyTime" + COALESCE((
				SELECT SUM("time_spent_seconds") / 60
				FROM "TopicProgress"
				WHERE "userId" = $1 AND "updated_at" > NOW() - INTERVAL '5 minutes'
			), 0),
			"tasksCompleted" = (
				SELECT COUNT(*) FROM "Task" WHERE "userId" = $1 AND "status" = 'DONE'
			),
			"examsPassed" = (
				SELECT COUNT(*) FROM "ExamResult" WHERE "user_id" = $1 AND "passed" = true
			),
			"updatedAt" = NOW()
		WHERE "id" = $1
	`, p.UserID)

	if result.Error != nil {
		return fmt.Errorf("flush progress for user: %w", result.Error)
	}

	return nil
}
