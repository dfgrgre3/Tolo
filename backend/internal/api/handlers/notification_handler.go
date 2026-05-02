package handlers

import (
	"net/http"
	"strconv"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"encoding/json"
	"github.com/gin-gonic/gin"
)

func GetNotifications(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var notifications []models.Notification
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Limit(limit).Offset(offset).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

func MarkNotificationRead(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ID != "" {
		// Mark specific notification as read
		if err := db.DB.Model(&models.Notification{}).Where("id = ? AND \"userId\" = ?", req.ID, userId).Update("\"isRead\"", true).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
			return
		}
	} else {
		// Mark all as read
		if err := db.DB.Model(&models.Notification{}).Where("\"userId\" = ?", userId).Update("\"isRead\"", true).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
			return
		}
	}

	// Notify via WebSocket to refresh notifications
	refreshMsg, _ := json.Marshal(gin.H{"type": "refresh_notifications"})
	GlobalHub.NotifyUser(userId.(string), refreshMsg)

	c.JSON(http.StatusOK, gin.H{"success": true})
}
