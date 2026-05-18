package commands

import (
	"fmt"
	"thanawy-backend/internal/db"

	"gorm.io/gorm"
)

type AwardXPCommand struct {
	UserID   string
	XPType   string
	XPAmount int
	Source   string
	SourceID string
}

type BatchFlushCommand struct {
	UserID string
}

type GamificationCommandService struct {
	writeDB *gorm.DB
}

func NewGamificationCommandService() *GamificationCommandService {
	return &GamificationCommandService{writeDB: db.WriteDB()}
}

func (s *GamificationCommandService) AwardXP(cmd AwardXPCommand) error {
	if cmd.XPAmount <= 0 {
		return nil
	}

	var updateColumn string
	switch cmd.XPType {
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

	result := s.writeDB.Exec(fmt.Sprintf(`
		UPDATE "User" SET
			"totalXP" = "totalXP" + $1,
			%s = %s + $1,
			"level" = FLOOR((("totalXP" + $1) / 100)) + 1,
			"updatedAt" = NOW()
		WHERE "id" = $2
	`, updateColumn, updateColumn), cmd.XPAmount, cmd.UserID)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *GamificationCommandService) FlushUserProgress(cmd BatchFlushCommand) error {
	return s.writeDB.Exec(`
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
	`, cmd.UserID).Error
}
