package queries

import (
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

const whereUserID = "user_id = ?"

type ProgressQueryService struct {
	readDB *gorm.DB
}

type ProgressSummaryReadModel struct {
	TotalMinutes   int     `json:"totalMinutes"`
	AverageFocus   float64 `json:"averageFocus"`
	TasksCompleted int64   `json:"tasksCompleted"`
	StreakDays     int     `json:"streakDays"`
}

type WeeklyAnalyticsReadModel struct {
	ProgressRate   int              `json:"progressRate"`
	SkillsAcquired int              `json:"skillsAcquired"`
	StudyHours     int              `json:"studyHours"`
	DailyProgress  []DailyProgress  `json:"dailyProgress"`
	Timestamp      time.Time        `json:"timestamp"`
}

type DailyProgress struct {
	Day      string `json:"day"`
	Progress int    `json:"progress"`
}

func NewProgressQueryService() *ProgressQueryService {
	return &ProgressQueryService{readDB: db.ReadDB()}
}

func (s *ProgressQueryService) GetSummary(userID string) (*ProgressSummaryReadModel, error) {
	// Read from materialized view for fast single-query aggregation
	var mv UserProgressSummaryReadModel
	if err := s.readDB.Where(whereUserID, userID).First(&mv).Error; err != nil {
		return s.getSummaryFallback(userID)
	}

	return &ProgressSummaryReadModel{
		TotalMinutes:   mv.WeeklyStudyMinutes,
		AverageFocus:   float64(mv.WeeklyAvgFocus),
		TasksCompleted: int64(mv.TasksCompleted),
		StreakDays:     mv.CurrentStreak,
	}, nil
}

func (s *ProgressQueryService) getSummaryFallback(userID string) (*ProgressSummaryReadModel, error) {
	summary := &ProgressSummaryReadModel{}

	type studyStats struct {
		TotalMinutes int
		AvgFocus     float64
	}
	var stats studyStats
	if err := s.readDB.Model(&models.StudySession{}).
		Where(whereUserID, userID).
		Select("COALESCE(SUM(duration_min), 0) as total_minutes, COALESCE(AVG(focus_score), 0) as avg_focus").
		Scan(&stats).Error; err != nil {
		return nil, err
	}
	summary.TotalMinutes = stats.TotalMinutes
	summary.AverageFocus = stats.AvgFocus

	s.readDB.Model(&models.Task{}).
		Where("user_id = ? AND status = ?", userID, "COMPLETED").
		Count(&summary.TasksCompleted)

	summary.StreakDays = s.calculateStreakDays(userID)
	return summary, nil
}

func (s *ProgressQueryService) calculateStreakDays(userID string) int {
	type dayResult struct {
		Day string
	}
	var days []dayResult
	s.readDB.Model(&models.StudySession{}).
		Select("DISTINCT DATE(start_time) as day").
		Where("user_id = ? AND start_time >= ?", userID, time.Now().AddDate(-1, 0, 0)).
		Order("day DESC").
		Scan(&days)

	if len(days) == 0 {
		return 0
	}

	streak := 0
	currentDate := time.Now()
	daySet := make(map[string]bool, len(days))
	for _, d := range days {
		daySet[d.Day] = true
	}

	for {
		dayStr := currentDate.Format("2006-01-02")
		if daySet[dayStr] {
			streak++
			currentDate = currentDate.AddDate(0, 0, -1)
		} else {
			break
		}
	}
	return streak
}

func (s *ProgressQueryService) GetWeeklyAnalytics(userID string) (*WeeklyAnalyticsReadModel, error) {
	// Read from materialized view
	var mv WeeklyAnalyticsReadModelV2
	if err := s.readDB.Where(whereUserID, userID).First(&mv).Error; err != nil {
		return s.getWeeklyAnalyticsFallback(userID)
	}

	progressRate := 0
	if mv.TotalStudyMinutes > 0 {
		targetMinutes := 210
		progressRate = int(float64(mv.TotalStudyMinutes) / float64(targetMinutes) * 100)
		if progressRate > 100 {
			progressRate = 100
		}
	}

	var dailyArr []DailyProgress
	if mv.ActiveDays > 0 {
		dailyArr = []DailyProgress{
			{Day: "Tue", Progress: mv.TotalStudyMinutes / mv.ActiveDays},
		}
	}

	return &WeeklyAnalyticsReadModel{
		ProgressRate:   progressRate,
		SkillsAcquired: mv.CompletedTasks,
		StudyHours:     mv.TotalStudyMinutes / 60,
		DailyProgress:  dailyArr,
		Timestamp:      mv.ComputedAt,
	}, nil
}

func (s *ProgressQueryService) getWeeklyAnalyticsFallback(userID string) (*WeeklyAnalyticsReadModel, error) {
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	var sessions []models.StudySession
	if err := s.readDB.Where("user_id = ? AND start_time >= ?", userID, sevenDaysAgo).
		Order("start_time asc").Find(&sessions).Error; err != nil {
		return nil, err
	}

	dailyProgress := make(map[string]int)
	totalStudyMinutes := 0
	for _, session := range sessions {
		day := session.CreatedAt.Format("Mon")
		dailyProgress[day] += session.DurationMin
		totalStudyMinutes += session.DurationMin
	}

	var dailyProgressArr []DailyProgress
	days := []string{"Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"}
	for _, day := range days {
		dailyProgressArr = append(dailyProgressArr, DailyProgress{Day: day, Progress: dailyProgress[day]})
	}

	progressRate := 0
	if totalStudyMinutes > 0 {
		targetMinutes := 210
		progressRate = int(float64(totalStudyMinutes) / float64(targetMinutes) * 100)
		if progressRate > 100 {
			progressRate = 100
		}
	}

	var skillsAcquired int64
	s.readDB.Model(&models.Task{}).Where("user_id = ? AND status = ?", userID, "COMPLETED").Count(&skillsAcquired)

	return &WeeklyAnalyticsReadModel{
		ProgressRate:   progressRate,
		SkillsAcquired: int(skillsAcquired),
		StudyHours:     totalStudyMinutes / 60,
		DailyProgress:  dailyProgressArr,
		Timestamp:      time.Now(),
	}, nil
}
