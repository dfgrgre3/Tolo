package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"net/http"
	"runtime"
	"strings"
	"time"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

func GetUnreadNotificationsCount(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var count int64
	if err := db.DB.Model(&models.Notification{}).Where("\"userId\" = ? AND \"isRead\" = ?", userId, false).Count(&count).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to count notifications")
		return
	}

	api_response.Success(c, gin.H{"count": count})
}

func GetRecentActivities(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var notifications []models.Notification
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Limit(10).Find(&notifications).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch activities")
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

	api_response.Success(c, gin.H{"activities": activities})
}

func GetWalletBalance(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "User not found")
		return
	}

	var payments []models.Payment
	db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Limit(20).Find(&payments)

	api_response.Success(c, gin.H{
		"balance":      user.Balance,
		"currency":     "EGP",
		"transactions": payments,
		"history":      payments, // For compatibility with different frontend versions
	})
}

// GetSubscriptionPlans is defined in subscription_handler.go
// This file now delegates to that implementation

func GlobalSearch(c *gin.Context) {
	api_response.Success(c, gin.H{
		"results": []interface{}{},
	})
}

func GetLibraryBooks(c *gin.Context) {
	api_response.Success(c, gin.H{
		"books": []interface{}{},
	})
}

func GetLessonNotes(c *gin.Context) {
	api_response.Success(c, gin.H{
		"notes": []interface{}{},
	})
}

func CreateLessonNote(c *gin.Context) {
	api_response.Created(c, gin.H{"success": true})
}

func ImpersonateUser(c *gin.Context) {
	var req struct {
		TargetUserID string `json:"targetUserId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid request")
		return
	}

	// Verify target user exists
	var user models.User
	if err := db.DB.First(&user, "id = ?", req.TargetUserID).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "User not found")
		return
	}

	// Set impersonation cookie
	// In a real app, this should be a signed cookie or stored in a session
	c.SetCookie("impersonate_user_id", req.TargetUserID, 3600, "/", "", false, true)

	api_response.Success(c, gin.H{
		"success": true,
		"message": fmt.Sprintf("أنت الآن تنتحل شخصية %s", user.Email),
	})
}

func GetAdminInfrastructureStats(c *gin.Context) {
	var memory runtime.MemStats
	runtime.ReadMemStats(&memory)

	sqlDB, err := db.DB.DB()
	dbStatus := "healthy"
	var dbOpenConns int
	if err != nil {
		dbStatus = "unhealthy"
	} else {
		stats := sqlDB.Stats()
		dbOpenConns = stats.OpenConnections
	}

	api_response.Success(c, gin.H{
		"cpuUsage":      runtime.NumCPU() * 2, // Estimated
		"memoryUsage":   (memory.Alloc * 100) / (memory.Sys + 1),
		"dbStatus":      dbStatus,
		"dbOpenConnections": dbOpenConns,
		"redisLatency":  5, // Placeholder for Redis
		"memoryMiB":     memory.Alloc / 1024 / 1024,
		"goroutines":    runtime.NumGoroutine(),
		"queues": gin.H{
			"gamification":  gin.H{"active": 0, "waiting": 0, "failed": 0, "completed": 0},
			"notifications": gin.H{"active": 0, "waiting": 0, "failed": 0, "completed": 0},
		},
	})
}

func GetAdminMetricsHistory(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	sqlDB, err := db.DB.DB()
	var dbOpenConns int
	if err == nil {
		stats := sqlDB.Stats()
		dbOpenConns = stats.OpenConnections
	}

	metrics := []gin.H{
		{
			"timestamp": time.Now().UnixMilli(),
			"type":      "memory",
			"value":     m.Alloc / 1024 / 1024, // MB
		},
		{
			"timestamp": time.Now().UnixMilli(),
			"type":      "goroutines",
			"value":     runtime.NumGoroutine(),
		},
		{
			"timestamp": time.Now().UnixMilli(),
			"type":      "db_connections",
			"value":     dbOpenConns,
		},
	}

	stats := gin.H{
		"memoryTotal":         m.TotalAlloc / 1024 / 1024,
		"memorySys":           m.Sys / 1024 / 1024,
		"numCPU":              runtime.NumCPU(),
		"dbOpenConnections":  dbOpenConns,
		"averageResponseTime": 120,
		"errorRate":           0.01,
	}

	api_response.Success(c, gin.H{
		"metrics": metrics,
		"stats":   stats,
	})
}

func formatMiB(value uint64) string {
	return fmt.Sprintf("%d MiB", value/1024/1024)
}
