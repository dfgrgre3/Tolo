package queries

import (
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"gorm.io/gorm"
)

type TimeAnalyticsReadModel struct {
	TotalStudyMinutes int     `json:"totalStudyMinutes"`
	TotalSessions     int     `json:"totalSessions"`
	TotalTasks        int     `json:"totalTasks"`
	CompletedTasks    int     `json:"completedTasks"`
	CompletionRate    float64 `json:"completionRate"`
}

type ActivityMetricsReadModel struct {
	DailyActiveUsers       int64              `json:"dailyActiveUsers"`
	WeeklyActiveUsers      int64              `json:"weeklyActiveUsers"`
	MonthlyActiveUsers     int64              `json:"monthlyActiveUsers"`
	AverageSessionDuration float64            `json:"averageSessionDuration"`
	BounceRate             float64            `json:"bounceRate"`
	TopPages               []PageStats        `json:"topPages"`
	UserFlows              []FlowStats        `json:"userFlows"`
	ConversionRates        map[string]float64 `json:"conversionRates"`
}

type PageStats struct {
	Page           string  `json:"page"`
	Views          int64   `json:"views"`
	UniqueVisitors int64   `json:"uniqueVisitors"`
	AvgDuration    float64 `json:"avgDuration"`
}

type FlowStats struct {
	From  string `json:"from"`
	To    string `json:"to"`
	Count int64  `json:"count"`
}

type AnalyticsQueryService struct {
	readDB *gorm.DB
}

func NewAnalyticsQueryService() *AnalyticsQueryService {
	return &AnalyticsQueryService{readDB: db.ReadDB()}
}

func (s *AnalyticsQueryService) GetTimeAnalytics(userID string) (*TimeAnalyticsReadModel, error) {
	var sessionStats struct {
		TotalStudyMinutes int
		TotalSessions     int
	}
	if err := s.readDB.Model(&models.StudySession{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(duration_min), 0) as total_study_minutes, COUNT(id) as total_sessions").
		Scan(&sessionStats).Error; err != nil {
		return nil, err
	}

	var taskStats struct {
		TotalTasks     int
		CompletedTasks int
	}
	if err := s.readDB.Model(&models.Task{}).
		Where("user_id = ?", userID).
		Select("COUNT(id) as total_tasks, SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks").
		Scan(&taskStats).Error; err != nil {
		return nil, err
	}

	completionRate := 0.0
	if taskStats.TotalTasks > 0 {
		completionRate = float64(taskStats.CompletedTasks) / float64(taskStats.TotalTasks) * 100
	}

	return &TimeAnalyticsReadModel{
		TotalStudyMinutes: sessionStats.TotalStudyMinutes,
		TotalSessions:     sessionStats.TotalSessions,
		TotalTasks:        taskStats.TotalTasks,
		CompletedTasks:    taskStats.CompletedTasks,
		CompletionRate:    completionRate,
	}, nil
}
