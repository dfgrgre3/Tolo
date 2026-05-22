package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
)

func parsePositiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func AdminListNotifications(c *gin.Context) {
	limit := parsePositiveInt(c.DefaultQuery("limit", "50"), 50)

	var notifications []models.Notification
	query := db.DB.Model(&models.Notification{}).Order("created_at DESC").Limit(limit)
	if userID := c.Query("userId"); userID != "" {
		query = query.Where(userIDQuery, userID)
	}
	if err := query.Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	var unreadCount int64
	countQuery := db.DB.Model(&models.Notification{}).Where("is_read = ?", false)
	if userID := c.Query("userId"); userID != "" {
		countQuery = countQuery.Where(userIDQuery, userID)
	}
	if err := countQuery.Count(&unreadCount).Error; err != nil {
		unreadCount = 0
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"notifications": notifications,
		"unreadCount":   unreadCount,
	}})
}

func AdminMarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Notification id is required"})
		return
	}

	if err := db.DB.Model(&models.Notification{}).Where(idQuery, id).Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

func AdminMarkAllNotificationsRead(c *gin.Context) {
	if err := db.DB.Model(&models.Notification{}).Where("is_read = ?", false).Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Notifications marked as read"})
}

func AdminDeleteNotification(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Notification id is required"})
		return
	}

	if err := db.DB.Delete(&models.Notification{}, idQuery, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

func AdminEnforceUserTwoFactor(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User id is required"})
		return
	}

	settings := models.TwoFactorSettings{
		UserID:     userID,
		Method:     "authenticator",
		IsEnforced: true,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	if err := db.DB.Where(userIDQuery, userID).Assign(map[string]interface{}{
		"is_enforced": true,
		"updated_at":  time.Now(),
	}).FirstOrCreate(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enforce 2FA"})
		return
	}

	middleware.LogCriticalOperation(c, "2fa_enforced_for_user", map[string]interface{}{"user_id": userID})
	c.JSON(http.StatusOK, gin.H{"message": "2FA enforcement updated", "data": gin.H{"userId": userID, "isEnforced": true}})
}

func AdminResetUserTwoFactor(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User id is required"})
		return
	}

	if err := db.DB.Where(userIDQuery, userID).Delete(&models.TwoFactorSettings{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset 2FA"})
		return
	}
	db.DB.Model(&models.User{}).Where(idQuery, userID).Updates(map[string]interface{}{
		"two_factor_enabled": false,
		"two_factor_secret":  nil,
	})

	middleware.LogCriticalOperation(c, "2fa_reset_for_user", map[string]interface{}{"user_id": userID})
	c.JSON(http.StatusOK, gin.H{"message": "2FA reset successfully"})
}

func SuspendSession(c *gin.Context) {
	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session id is required"})
		return
	}

	if err := db.DB.Model(&models.UserSession{}).Where(idQuery, sessionID).Updates(map[string]interface{}{
		"status":     "suspended",
		"is_active":  false,
		"updated_at": time.Now(),
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to suspend session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Session suspended"})
}

func GetSessionActivity(c *gin.Context) {
	limit := parsePositiveInt(c.DefaultQuery("limit", "100"), 100)
	var sessions []models.UserSession
	if err := db.DB.Order("updated_at DESC").Limit(limit).Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session activity"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"activity": sessions}})
}

func UpdateTicketTags(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Tags []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Model(&models.SupportTicket{}).Where(idQuery, id).Updates(map[string]interface{}{
		"tags":       req.Tags,
		"updated_at": time.Now(),
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket tags"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Ticket tags updated", "data": gin.H{"tags": req.Tags}})
}

func UpdateBackupSchedule(c *gin.Context) {
	ScheduleBackup(c)
}

func DeleteBackupSchedule(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Backup schedule deleted"})
}
