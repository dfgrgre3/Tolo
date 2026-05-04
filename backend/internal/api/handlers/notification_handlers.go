package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
)

// NotificationRequest represents a broadcast notification request
type NotificationRequest struct {
	UserIDs     []string `json:"userIds" binding:"required,min=1"`
	Title       string   `json:"title" binding:"required,max=200"`
	Message     string   `json:"message" binding:"required,max=2000"`
	Type        string   `json:"type" binding:"omitempty,oneof=info success warning error"`
	Channels    []string `json:"channels" binding:"required,min=1"`
	ActionURL   string   `json:"actionUrl" binding:"omitempty,url"`
	Priority    string   `json:"priority" binding:"omitempty,oneof=high normal low"`
	ScheduledFor *time.Time `json:"scheduledFor,omitempty"`
}

// NotificationResponse represents the response from sending notifications
type NotificationResponse struct {
	BroadcastID string                 `json:"broadcastId"`
	Summary    NotificationSummary    `json:"summary"`
	Queued     bool                   `json:"queued"`
}

// NotificationSummary contains delivery statistics
type NotificationSummary struct {
	Total    int `json:"total"`
	Success  int `json:"success"`
	Failure  int `json:"failure"`
	Queued   int `json:"queued"`
}

// SendNotificationBroadcast sends notifications to multiple users via various channels
// @Summary Send broadcast notification
// @Description Send notifications to multiple users via in-app, email, SMS, or push
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Param request body NotificationRequest true "Notification details"
// @Success 200 {object} NotificationResponse
// @Router /api/admin/notifications/broadcast [post]
func SendNotificationBroadcast(c *gin.Context) {
	var req NotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin user info
	adminID, _ := c.Get("user_id")
	adminRole, _ := c.Get("user_role")

	// Log critical operation
	middleware.LogCriticalOperation(c, "notification_broadcast", map[string]interface{}{
		"target_users": len(req.UserIDs),
		"channels":     req.Channels,
		"priority":     req.Priority,
		"scheduled":    req.ScheduledFor != nil,
	})

	// Create broadcast record
	broadcast := models.Broadcast{
		Title:        req.Title,
		Message:      req.Message,
		Type:         req.Type,
		Channels:     req.Channels,
		TargetCount:  len(req.UserIDs),
		Status:       "sending",
		CreatedBy:     adminID.(string),
		CreatedAt:     time.Now(),
	}

	if req.ScheduledFor != nil {
		broadcast.Status = "scheduled"
		broadcast.ScheduledFor = req.ScheduledFor
	}

	if err := db.DB.Create(&broadcast).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create broadcast"})
		return
	}

	// Queue notifications for each user
	notificationService := services.GetNotificationService()
	successCount := 0
	failureCount := 0

	for _, userID := range req.UserIDs {
		err := notificationService.QueueNotification(models.Notification{
			UserID:      userID,
			BroadcastID: broadcast.ID,
			Title:       req.Title,
			Message:     req.Message,
			Type:        models.NotificationType(strings.ToUpper(req.Type)),
			Channels:    req.Channels,
			Status:      "pending",
			Priority:    req.Priority,
			Link:        &req.ActionURL,
			CreatedAt:   time.Now(),
		})

		if err != nil {
			failureCount++
		} else {
			successCount++
		}
	}

	// Update broadcast status
	if req.ScheduledFor == nil {
		broadcast.Status = "completed"
		now := time.Now()
		broadcast.SentAt = &now
	}
	broadcast.SuccessCount = successCount
	broadcast.FailureCount = failureCount
	db.DB.Save(&broadcast)

	// Notify admins via WebSocket
	GlobalHub.NotifyAdmins(map[string]interface{}{
		"type":         "broadcast-completed",
		"broadcastId":  broadcast.ID,
		"success":      successCount,
		"failed":       failureCount,
		"total":        len(req.UserIDs),
		"adminId":      adminID,
		"adminRole":    adminRole,
	})

	c.JSON(http.StatusOK, NotificationResponse{
		BroadcastID: broadcast.ID,
		Summary: NotificationSummary{
			Total:   len(req.UserIDs),
			Success: successCount,
			Failure: failureCount,
			Queued:  successCount,
		},
		Queued: true,
	})
}

// ScheduleNotificationBroadcast schedules a notification for future delivery
// @Summary Schedule broadcast notification
// @Description Schedule notifications to be sent at a specific time
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Param request body NotificationRequest true "Notification details with scheduledFor"
// @Success 200 {object} NotificationResponse
// @Router /api/admin/notifications/schedule [post]
func ScheduleNotificationBroadcast(c *gin.Context) {
	var req NotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ScheduledFor == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scheduledFor is required"})
		return
	}

	// Ensure scheduled time is in the future
	if req.ScheduledFor.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scheduledFor must be in the future"})
		return
	}

	// Call the main broadcast function (it will handle the scheduled flag)
	SendNotificationBroadcast(c)
}

// CancelScheduledBroadcast cancels a scheduled broadcast
// @Summary Cancel scheduled broadcast
// @Description Cancel a notification that was scheduled for future delivery
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Param broadcastId path string true "Broadcast ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/notifications/broadcast/{broadcastId}/cancel [post]
func CancelScheduledBroadcast(c *gin.Context) {
	broadcastID := c.Param("broadcastId")
	adminID, _ := c.Get("user_id")

	var broadcast models.Broadcast
	if err := db.DB.First(&broadcast, "id = ?", broadcastID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Broadcast not found"})
		return
	}

	// Check if broadcast is scheduled
	if broadcast.Status != "scheduled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only cancel scheduled broadcasts"})
		return
	}

	// Update status
	broadcast.Status = "cancelled"
	broadcast.CancelledBy = ptrString(adminID.(string))
	now := time.Now()
	broadcast.CancelledAt = &now

	if err := db.DB.Save(&broadcast).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel broadcast"})
		return
	}

	// Cancel any pending notifications
	db.DB.Model(&models.Notification{}).
		Where("broadcast_id = ? AND status = ?", broadcastID, "pending").
		Update("status", "cancelled")

	c.JSON(http.StatusOK, gin.H{"message": "Broadcast cancelled successfully"})
}

// RetryFailedNotifications retries failed notifications from a broadcast
// @Summary Retry failed notifications
// @Description Retry sending notifications that previously failed
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Param broadcastId path string true "Broadcast ID"
// @Success 200 {object} NotificationResponse
// @Router /api/admin/notifications/broadcast/{broadcastId}/retry [post]
func RetryFailedNotifications(c *gin.Context) {
	broadcastID := c.Param("broadcastId")

	var notifications []models.Notification
	if err := db.DB.Where("broadcast_id = ? AND status = ?", broadcastID, "failed").Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch failed notifications"})
		return
	}

	notificationService := services.GetNotificationService()
	successCount := 0
	failureCount := 0

	for _, notification := range notifications {
		notification.Status = "pending"
		db.DB.Save(&notification)

		err := notificationService.QueueNotification(notification)
		if err != nil {
			failureCount++
		} else {
			successCount++
		}
	}

	c.JSON(http.StatusOK, NotificationResponse{
		BroadcastID: broadcastID,
		Summary: NotificationSummary{
			Total:   len(notifications),
			Success: successCount,
			Failure: failureCount,
		},
		Queued: true,
	})
}

// GetBroadcasts returns all broadcasts with filtering
// @Summary Get broadcasts
// @Description Get all notification broadcasts with optional filtering
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Param status query string false "Filter by status"
// @Param from query string false "Filter from date (RFC3339)"
// @Param to query string false "Filter to date (RFC3339)"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/broadcasts [get]
func GetBroadcasts(c *gin.Context) {
	status := c.Query("status")
	from := c.Query("from")
	to := c.Query("to")

	query := db.DB.Model(&models.Broadcast{}).Order("created_at DESC")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if from != "" {
		if fromTime, err := time.Parse(time.RFC3339, from); err == nil {
			query = query.Where("created_at >= ?", fromTime)
		}
	}

	if to != "" {
		if toTime, err := time.Parse(time.RFC3339, to); err == nil {
			query = query.Where("created_at <= ?", toTime)
		}
	}

	var broadcasts []models.Broadcast
	if err := query.Find(&broadcasts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch broadcasts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"broadcasts": broadcasts,
		},
	})
}

// GetNotificationStats returns statistics about notifications
// @Summary Get notification statistics
// @Description Get aggregated statistics about notification delivery
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/notifications/stats [get]
func GetNotificationStats(c *gin.Context) {
	var stats struct {
		TotalSent      int64 `json:"totalSent"`
		TotalDelivered int64 `json:"totalDelivered"`
		TotalFailed    int64 `json:"totalFailed"`
		TotalRead      int64 `json:"totalRead"`
		Pending        int64 `json:"pending"`
	}

	// Get counts by status
	db.DB.Model(&models.Notification{}).Count(&stats.TotalSent)
	db.DB.Model(&models.Notification{}).Where("status = ?", "delivered").Count(&stats.TotalDelivered)
	db.DB.Model(&models.Notification{}).Where("status = ?", "failed").Count(&stats.TotalFailed)
	db.DB.Model(&models.Notification{}).Where("status = ?", "read").Count(&stats.TotalRead)
	db.DB.Model(&models.Notification{}).Where("status = ?", "pending").Count(&stats.Pending)

	// Get channel breakdown
	var channelStats []struct {
		Channel string `json:"channel"`
		Count   int64  `json:"count"`
	}
	db.DB.Raw("SELECT unnest(channels) as channel, count(*) as count FROM notifications GROUP BY unnest(channels)").Scan(&channelStats)

	// Get recent broadcasts
	var recentBroadcasts []models.Broadcast
	db.DB.Order("created_at DESC").Limit(5).Find(&recentBroadcasts)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"overview":          stats,
			"byChannel":         channelStats,
			"recentBroadcasts": recentBroadcasts,
		},
	})
}

// SendPushNotification sends push notifications to specific users
// @Summary Send push notification
// @Description Send push notifications to specific users via FCM/APNs
// @Tags admin,notifications
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "Push notification details"
// @Success 200 {object} map[string]string
// @Router /api/admin/notifications/push [post]
func SendPushNotification(c *gin.Context) {
	var req struct {
		UserIDs []string               `json:"userIds" binding:"required,min=1"`
		Title   string                 `json:"title" binding:"required"`
		Body    string                 `json:"body" binding:"required"`
		Data    map[string]interface{} `json:"data,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get push service
	pushService := services.GetPushNotificationService()

	sent := 0
	failed := 0

	for _, userID := range req.UserIDs {
		// Get user's push tokens
		var tokens []models.PushToken
		db.DB.Where("user_id = ? AND is_active = ?", userID, true).Find(&tokens)

		for _, token := range tokens {
			err := pushService.Send(token.Token, req.Title, req.Body, req.Data)
			if err != nil {
				failed++
				// Mark token as potentially invalid
				if pushService.IsInvalidTokenError(err) {
					token.IsActive = false
					db.DB.Save(&token)
				}
			} else {
				sent++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Push notifications processed",
		"sent":    sent,
		"failed":  failed,
	})
}

func ptrString(s string) *string {
	return &s
}
