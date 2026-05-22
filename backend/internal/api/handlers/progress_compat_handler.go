package handlers

import (
	"net/http"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetUserCoursesProgress(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var total int64
	if err := db.DB.Model(&models.Enrollment{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch course progress"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"courses":        []gin.H{},
		"totalCourses":   total,
		"completed":      0,
		"inProgress":     total,
		"averagePercent": 0,
	})
}

func GetUserTimeProgress(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	summary, err := progressQuery.GetSummary(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch time progress"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"totalMinutes":   summary.TotalMinutes,
		"averageFocus":   summary.AverageFocus,
		"tasksCompleted": summary.TasksCompleted,
		"streakDays":     summary.StreakDays,
	})
}

func GetUserAchievementsProgress(c *gin.Context) {
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	achievements, err := gamificationQuery.GetUserAchievements(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch achievements progress"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"achievements": achievements,
		"total":        len(achievements),
	})
}

func currentUserID(c *gin.Context) (string, bool) {
	userID := c.GetString("userId")
	if userID == "" {
		return "", false
	}
	return userID, true
}
