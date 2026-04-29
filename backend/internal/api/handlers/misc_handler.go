package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"runtime"
	"strings"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

func GetUnreadNotificationsCount(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var count int64
	if err := db.DB.Model(&models.Notification{}).Where("\"userId\" = ? AND \"isRead\" = ?", userId, false).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func GetRecentActivities(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var notifications []models.Notification
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Limit(10).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activities"})
		return
	}

	activities := make([]gin.H, 0, len(notifications))
	for _, n := range notifications {
		activities = append(activities, gin.H{
			"id":          n.ID,
			"type":        strings.ToLower(string(n.Type)),
			"title":       n.Title,
			"description": n.Message,
			"timestamp":   n.CreatedAt,
			"read":        n.IsRead,
		})
	}

	c.JSON(http.StatusOK, gin.H{"activities": activities})
}

func GetWalletBalance(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"balance":      0,
		"currency":     "EGP",
		"transactions": []interface{}{},
	})
}

func GetSubscriptionPlans(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"plans": []gin.H{
			{
				"id":    "basic",
				"name":  "الباقة الأساسية",
				"price": 0,
			},
		},
	})
}

func GlobalSearch(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"results": []interface{}{},
	})
}

func GetLibraryBooks(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"books": []interface{}{},
	})
}

func GetLessonNotes(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"notes": []interface{}{},
	})
}

func CreateLessonNote(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func ImpersonateUser(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true})
}



func GetAdminInfrastructureStats(c *gin.Context) {
	var memory runtime.MemStats
	runtime.ReadMemStats(&memory)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"system": gin.H{
				"status":      "healthy",
				"uptime":      0,
				"memoryUsage": formatMiB(memory.Alloc),
			},
			"cache": gin.H{
				"usedMemory": formatMiB(memory.HeapAlloc),
			},
			"queues": gin.H{
				"gamification":  gin.H{"active": 0, "waiting": 0, "failed": 0, "completed": 0},
				"notifications": gin.H{"active": 0, "waiting": 0, "failed": 0, "completed": 0},
				"analytics":     gin.H{"active": 0, "waiting": 0, "failed": 0, "completed": 0},
			},
		},
	})
}

func GetAdminMetricsHistory(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"metrics": []interface{}{},
		},
	})
}

func formatMiB(value uint64) string {
	return fmt.Sprintf("%d MiB", value/1024/1024)
}
