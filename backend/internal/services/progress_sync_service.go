package services

import (
	"log"
	"sync"

	"thanawy-backend/internal/worker"
)

var (
	progressSyncInstance *ProgressSyncService
	progressSyncOnce     sync.Once
)

type ProgressSyncService struct {
	enabled bool
}

func GetProgressSyncService() *ProgressSyncService {
	progressSyncOnce.Do(func() {
		progressSyncInstance = &ProgressSyncService{
			enabled: true,
		}
	})
	return progressSyncInstance
}

func (s *ProgressSyncService) Disable() {
	s.enabled = false
}

func (s *ProgressSyncService) Enable() {
	s.enabled = true
}

func (s *ProgressSyncService) RecordLessonCompleted(userID, subTopicID string, timeSpentSeconds int) error {
	if !s.enabled {
		log.Printf("[ProgressSync] Disabled, skipping lesson completed for user %s", userID)
		return nil
	}

	payload := worker.ProgressUpdatePayload{
		UserID:           userID,
		SubTopicID:       subTopicID,
		EventType:        "lesson_completed",
		TimeSpentSeconds: timeSpentSeconds,
		Completed:        true,
	}

	if err := worker.EnqueueProgressUpdate(payload); err != nil {
		log.Printf("[ProgressSync] Failed to enqueue lesson completed: %v", err)
		return err
	}

	log.Printf("[ProgressSync] Queued lesson completed: user=%s sub_topic=%s", userID, subTopicID)
	return nil
}

func (s *ProgressSyncService) RecordLessonProgress(userID, subTopicID string, timeSpentSeconds int) error {
	if !s.enabled {
		return nil
	}

	payload := worker.ProgressUpdatePayload{
		UserID:           userID,
		SubTopicID:       subTopicID,
		EventType:        "lesson_progress",
		TimeSpentSeconds: timeSpentSeconds,
	}

	if err := worker.EnqueueProgressUpdate(payload); err != nil {
		log.Printf("[ProgressSync] Failed to enqueue lesson progress: %v", err)
		return err
	}

	return nil
}

func (s *ProgressSyncService) RecordExamCompleted(userID, examID string, score float64, passed bool) error {
	if !s.enabled {
		return nil
	}

	payload := worker.ProgressUpdatePayload{
		UserID:    userID,
		ExamID:    examID,
		EventType: "exam_completed",
		ExamScore: score,
		ExamPassed: passed,
	}

	if err := worker.EnqueueProgressUpdate(payload); err != nil {
		log.Printf("[ProgressSync] Failed to enqueue exam completed: %v", err)
		return err
	}

	log.Printf("[ProgressSync] Queued exam completed: user=%s exam=%s score=%.1f", userID, examID, score)
	return nil
}

func (s *ProgressSyncService) RecordTaskCompleted(userID, taskID string) error {
	if !s.enabled {
		return nil
	}

	payload := worker.ProgressUpdatePayload{
		UserID:      userID,
		TaskID:      taskID,
		EventType:   "task_completed",
		TaskCompleted: true,
	}

	if err := worker.EnqueueProgressUpdate(payload); err != nil {
		log.Printf("[ProgressSync] Failed to enqueue task completed: %v", err)
		return err
	}

	return nil
}

func (s *ProgressSyncService) RecordStudySession(userID string, durationMinutes int) error {
	if !s.enabled {
		return nil
	}

	payload := worker.ProgressUpdatePayload{
		UserID:              userID,
		EventType:           "study_session",
		StudySessionMinutes: durationMinutes,
	}

	if err := worker.EnqueueProgressUpdate(payload); err != nil {
		log.Printf("[ProgressSync] Failed to enqueue study session: %v", err)
		return err
	}

	return nil
}

func (s *ProgressSyncService) AwardXP(userID string, xpType string, amount int, source string, sourceID string) error {
	if !s.enabled {
		return nil
	}

	if amount <= 0 {
		return nil
	}

	payload := worker.GamificationSyncPayload{
		UserID:   userID,
		XPType:   xpType,
		XPAmount: amount,
		Source:   source,
		SourceID: sourceID,
	}

	if err := worker.EnqueueGamificationSync(payload); err != nil {
		log.Printf("[ProgressSync] Failed to enqueue XP award: %v", err)
		return err
	}

	log.Printf("[ProgressSync] Queued XP award: user=%s +%d %s XP (%s)", userID, amount, xpType, source)
	return nil
}

func (s *ProgressSyncService) AwardStudyXP(userID string, amount int, source string, sourceID string) error {
	return s.AwardXP(userID, "study", amount, source, sourceID)
}

func (s *ProgressSyncService) AwardTaskXP(userID string, amount int, source string, sourceID string) error {
	return s.AwardXP(userID, "task", amount, source, sourceID)
}

func (s *ProgressSyncService) AwardExamXP(userID string, amount int, source string, sourceID string) error {
	return s.AwardXP(userID, "exam", amount, source, sourceID)
}

func (s *ProgressSyncService) AwardChallengeXP(userID string, amount int, source string, sourceID string) error {
	return s.AwardXP(userID, "challenge", amount, source, sourceID)
}

func (s *ProgressSyncService) AwardQuestXP(userID string, amount int, source string, sourceID string) error {
	return s.AwardXP(userID, "quest", amount, source, sourceID)
}

func (s *ProgressSyncService) AwardSeasonXP(userID string, amount int, source string, sourceID string) error {
	return s.AwardXP(userID, "season", amount, source, sourceID)
}

func (s *ProgressSyncService) FlushUserProgress(userID string) error {
	if !s.enabled {
		return nil
	}

	if err := worker.EnqueueBatchProgressFlush(userID); err != nil {
		log.Printf("[ProgressSync] Failed to enqueue batch flush: %v", err)
		return err
	}

	return nil
}
