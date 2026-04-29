package grpc

import (
	"context"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	thanawyv1 "thanawy-backend/internal/proto/thanawy/v1"
	"thanawy-backend/internal/proto/thanawy/v1/thanawyv1connect"
	"time"

	"connectrpc.com/connect"
)

type AnalyticsServiceServer struct {
	thanawyv1.UnimplementedAnalyticsServiceServer
}

func (s *AnalyticsServiceServer) GetProgressSummary(ctx context.Context, req *thanawyv1.GetProgressSummaryRequest) (*thanawyv1.GetProgressSummaryResponse, error) {
	// In a real app, we'd get userId from context
	userId := "TODO_FROM_CONTEXT"

	type Stats struct {
		TotalMinutes int
		AvgFocus     float64
		Count        int
	}
	var stats Stats
	db.DB.Model(&models.StudySession{}).
		Where("\"userId\" = ?", userId).
		Select("SUM(\"durationMin\") as total_minutes, AVG(\"focusScore\") as avg_focus, COUNT(*) as count").
		Scan(&stats)

	var tasksCompleted int64
	db.DB.Model(&models.Task{}).
		Where("\"userId\" = ? AND status = ?", userId, "COMPLETED").
		Count(&tasksCompleted)

	streakDays := calculateStreakDays(userId)

	return &thanawyv1.GetProgressSummaryResponse{
		TotalMinutes:   int32(stats.TotalMinutes),
		AverageFocus:   stats.AvgFocus,
		TasksCompleted: tasksCompleted,
		StreakDays:     int32(streakDays),
	}, nil
}

func (s *AnalyticsServiceServer) GetWeeklyAnalytics(ctx context.Context, req *thanawyv1.GetWeeklyAnalyticsRequest) (*thanawyv1.GetWeeklyAnalyticsResponse, error) {
	userId := "TODO_FROM_CONTEXT"

	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	var sessions []models.StudySession
	db.DB.Where("\"userId\" = ? AND \"createdAt\" >= ?", userId, sevenDaysAgo).Order("\"createdAt\" asc").Find(&sessions)

	dailyProgress := make(map[string]int)
	totalStudyMinutes := 0
	for _, session := range sessions {
		day := session.CreatedAt.Format("Mon")
		dailyProgress[day] += session.DurationMin
		totalStudyMinutes += session.DurationMin
	}

	var dailyProgressProto []*thanawyv1.DailyProgress
	days := []string{"Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"}
	for _, day := range days {
		progress := dailyProgress[day]
		dailyProgressProto = append(dailyProgressProto, &thanawyv1.DailyProgress{
			Day:      day,
			Progress: int32(progress),
		})
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
	db.DB.Model(&models.Task{}).Where("\"userId\" = ? AND status = ?", userId, "COMPLETED").Count(&skillsAcquired)

	return &thanawyv1.GetWeeklyAnalyticsResponse{
		ProgressRate:   int32(progressRate),
		SkillsAcquired: int32(skillsAcquired),
		StudyHours:     int32(totalStudyMinutes / 60),
		DailyProgress:  dailyProgressProto,
	}, nil
}

// Connect Wrapper
type AnalyticsConnectHandler struct {
	thanawyv1connect.UnimplementedAnalyticsServiceHandler
	Svc *AnalyticsServiceServer
}

func (h *AnalyticsConnectHandler) GetProgressSummary(ctx context.Context, req *connect.Request[thanawyv1.GetProgressSummaryRequest]) (*connect.Response[thanawyv1.GetProgressSummaryResponse], error) {
	res, err := h.Svc.GetProgressSummary(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(res), nil
}

func (h *AnalyticsConnectHandler) GetWeeklyAnalytics(ctx context.Context, req *connect.Request[thanawyv1.GetWeeklyAnalyticsRequest]) (*connect.Response[thanawyv1.GetWeeklyAnalyticsResponse], error) {
	res, err := h.Svc.GetWeeklyAnalytics(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(res), nil
}

// Helper (reused from progress_handler.go logic)
func calculateStreakDays(userID string) int {
	var sessions []models.StudySession
	db.DB.Where("\"userId\" = ?", userID).Order("\"createdAt\" DESC").Find(&sessions)

	if len(sessions) == 0 {
		return 0
	}

	activityDays := make(map[string]bool)
	for _, session := range sessions {
		day := session.CreatedAt.Format("2006-01-02")
		activityDays[day] = true
	}

	streak := 0
	currentDate := time.Now()
	for {
		dayStr := currentDate.Format("2006-01-02")
		if activityDays[dayStr] {
			streak++
			currentDate = currentDate.AddDate(0, 0, -1)
		} else {
			break
		}
	}
	return streak
}
