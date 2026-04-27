package handlers

import (
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
)

type ProgressSummary struct {
	TotalMinutes   int     `json:"totalMinutes"`
	AverageFocus   float64 `json:"averageFocus"`
	TasksCompleted int64   `json:"tasksCompleted"`
	StreakDays     int     `json:"streakDays"`
}

func GetProgressSummary(c *gin.Context) {
	userId, _ := c.Get("userId")
	uid := userId.(string)

	var summary ProgressSummary

	// 1. Calculate total minutes and average focus
	type Stats struct {
		TotalMinutes int
		AvgFocus     float64
		Count        int
	}
	var stats Stats
	db.DB.Model(&models.StudySession{}).
		Where("user_id = ?", uid).
		Select("SUM(duration_min) as total_minutes, AVG(focus_score) as avg_focus, COUNT(*) as count").
		Scan(&stats)

	summary.TotalMinutes = stats.TotalMinutes
	summary.AverageFocus = stats.AvgFocus

	// 2. Count completed tasks
	db.DB.Model(&models.Task{}).
		Where("user_id = ? AND status = ?", uid, "COMPLETED").
		Count(&summary.TasksCompleted)

	// 3. Calculate Streak Days (consecutive days with study sessions)
	summary.StreakDays = calculateStreakDays(uid)

	c.JSON(http.StatusOK, summary)
}

// calculateStreakDays calculates consecutive days with study sessions
func calculateStreakDays(userID string) int {
	var sessions []models.StudySession
	// Get all study sessions for the user, ordered by creation date descending
	db.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&sessions)

	if len(sessions) == 0 {
		return 0
	}

	// Get unique days with activity
	activityDays := make(map[string]bool)
	for _, session := range sessions {
		day := session.CreatedAt.Format("2006-01-02")
		activityDays[day] = true
	}

	// Calculate streak from today backwards
	streak := 0
	currentDate := time.Now()

	for {
		dayStr := currentDate.Format("2006-01-02")
		if activityDays[dayStr] {
			streak++
			currentDate = currentDate.AddDate(0, 0, -1) // Go back one day
		} else {
			break
		}
	}

	return streak
}
func GetWeeklyAnalytics(c *gin.Context) {
	userId := c.Query("userId")
	if userId == "" {
		uid, _ := c.Get("userId")
		if uid != nil {
			userId = uid.(string)
		}
	}

	if userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	// Calculate weekly analytics from database
	// 1. Get study sessions for the past 7 days
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	var sessions []models.StudySession
	db.DB.Where("user_id = ? AND created_at >= ?", userId, sevenDaysAgo).Order("created_at asc").Find(&sessions)

	// 2. Aggregate daily progress
	dailyProgress := make(map[string]int)
	totalStudyMinutes := 0
	for _, session := range sessions {
		day := session.CreatedAt.Format("Mon") // Short day name
		dailyProgress[day] += session.DurationMin
		totalStudyMinutes += session.DurationMin
	}

	// Convert to array for response
	type DailyProgress struct {
		Day      string `json:"day"`
		Progress int    `json:"progress"`
	}
	var dailyProgressArr []DailyProgress
	days := []string{"Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"}
	for _, day := range days {
		progress := dailyProgress[day]
		dailyProgressArr = append(dailyProgressArr, DailyProgress{Day: day, Progress: progress})
	}

	// 3. Calculate progress rate (percentage of planned study time)
	// TODO: Compare with user's study plan
	progressRate := 0
	if totalStudyMinutes > 0 {
		// Assume a target of 30 minutes per day = 210 minutes per week
		targetMinutes := 210
		progressRate = int(float64(totalStudyMinutes) / float64(targetMinutes) * 100)
		if progressRate > 100 {
			progressRate = 100
		}
	}

	// 4. Count skills acquired (completed tasks)
	var skillsAcquired int64
	db.DB.Model(&models.Task{}).Where("user_id = ? AND status = ?", userId, "COMPLETED").Count(&skillsAcquired)

	c.JSON(http.StatusOK, gin.H{
		"progressRate":   progressRate,
		"skillsAcquired": int(skillsAcquired),
		"studyHours":     totalStudyMinutes / 60, // Convert to hours
		"dailyProgress":  dailyProgressArr,
		"timestamp":      time.Now(),
	})
}
