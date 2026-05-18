package handlers

import (
	"net/http"
	"thanawy-backend/internal/cqrs/queries"

	"github.com/gin-gonic/gin"
)

var (
	progressQuery = queries.NewProgressQueryService()
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

	summary, err := progressQuery.GetSummary(uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get progress summary"})
		return
	}

	c.JSON(http.StatusOK, ProgressSummary{
		TotalMinutes:   summary.TotalMinutes,
		AverageFocus:   summary.AverageFocus,
		TasksCompleted: summary.TasksCompleted,
		StreakDays:     summary.StreakDays,
	})
}

func GetWeeklyAnalytics(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	result, err := progressQuery.GetWeeklyAnalytics(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get weekly analytics"})
		return
	}

	c.JSON(http.StatusOK, result)
}
