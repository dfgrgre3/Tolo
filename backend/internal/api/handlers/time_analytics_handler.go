package handlers

import (
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetTimeAnalytics(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	var sessionStats struct {
		TotalStudyMinutes int
		TotalSessions     int
	}
	db.DB.Model(&models.StudySession{}).Where("\"userId\" = ?", userId).Select("COALESCE(SUM(\"durationMin\"), 0) as total_study_minutes, COUNT(id) as total_sessions").Scan(&sessionStats)

	var taskStats struct {
		TotalTasks     int
		CompletedTasks int
	}
	db.DB.Model(&models.Task{}).Where("\"userId\" = ?", userId).Select("COUNT(id) as total_tasks, SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_tasks").Scan(&taskStats)

	completionRate := 0.0
	if taskStats.TotalTasks > 0 {
		completionRate = float64(taskStats.CompletedTasks) / float64(taskStats.TotalTasks) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"totalStudyMinutes": sessionStats.TotalStudyMinutes,
		"totalSessions":     sessionStats.TotalSessions,
		"totalTasks":        taskStats.TotalTasks,
		"completedTasks":    taskStats.CompletedTasks,
		"completionRate":    completionRate,
	})
}
