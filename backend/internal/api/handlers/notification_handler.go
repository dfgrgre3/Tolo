package handlers

import (
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetNotifications(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var notifications []models.Notification
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Find(&notifications).Error; err != nil {
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
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

	c.JSON(http.StatusOK, gin.H{"success": true})
}
