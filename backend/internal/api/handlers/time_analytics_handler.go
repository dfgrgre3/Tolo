package handlers

import (
	"net/http"
	"thanawy-backend/internal/cqrs/queries"

	"github.com/gin-gonic/gin"
)

var (
	analyticsQuery = queries.NewAnalyticsQueryService()
)

func GetTimeAnalytics(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	result, err := analyticsQuery.GetTimeAnalytics(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch time analytics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"totalStudyMinutes": result.TotalStudyMinutes,
		"totalSessions":     result.TotalSessions,
		"totalTasks":        result.TotalTasks,
		"completedTasks":    result.CompletedTasks,
		"completionRate":    result.CompletionRate,
	})
}
