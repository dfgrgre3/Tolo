package services

import (
	"fmt"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

// NotificationService handles notification operations
type NotificationService struct {
	queueService *NotificationQueueService
}

var notificationServiceInstance *NotificationService

// GetNotificationService returns the singleton notification service
func GetNotificationService() *NotificationService {
	if notificationServiceInstance == nil {
		notificationServiceInstance = &NotificationService{
			queueService: GetNotificationQueueService(),
		}
	}
	return notificationServiceInstance
}

// QueueNotification adds a notification to the queue
func (s *NotificationService) QueueNotification(notification models.Notification) error {
	// Save to database
	if err := db.DB.Create(&notification).Error; err != nil {
		return fmt.Errorf("failed to save notification: %w", err)
	}

	// Add to processing queue
	return s.queueService.Enqueue(notification)
}

// MarkAsSent marks a notification as sent
func (s *NotificationService) MarkAsSent(notificationID string) error {
	return db.DB.Model(&models.Notification{}).
		Where("id = ?", notificationID).
		Updates(map[string]interface{}{
			"status": "sent",
			"sent_at": "NOW()",
		}).Error
}

// MarkAsDelivered marks a notification as delivered
func (s *NotificationService) MarkAsDelivered(notificationID string) error {
	return db.DB.Model(&models.Notification{}).
		Where("id = ?", notificationID).
		Updates(map[string]interface{}{
			"status": "delivered",
			"delivered_at": "NOW()",
		}).Error
}

// MarkAsRead marks a notification as read
func (s *NotificationService) MarkAsRead(notificationID string) error {
	return db.DB.Model(&models.Notification{}).
		Where("id = ?", notificationID).
		Updates(map[string]interface{}{
			"status": "read",
			"read_at": "NOW()",
		}).Error
}

// MarkAsFailed marks a notification as failed
func (s *NotificationService) MarkAsFailed(notificationID string, errorMsg string) error {
	return db.DB.Model(&models.Notification{}).
		Where("id = ?", notificationID).
		Updates(map[string]interface{}{
			"status": "failed",
			"error": errorMsg,
		}).Error
}

// GetUnreadNotifications gets unread notifications for a user
func (s *NotificationService) GetUnreadNotifications(userID string, limit int) ([]models.Notification, error) {
	var notifications []models.Notification
	if err := db.DB.
		Where("user_id = ? AND status IN ?", userID, []string{"delivered", "sent"}).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifications).Error; err != nil {
		return nil, err
	}
	return notifications, nil
}

// GetUserNotifications gets all notifications for a user
func (s *NotificationService) GetUserNotifications(userID string, offset, limit int) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	var total int64

	if err := db.DB.Model(&models.Notification{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.DB.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&notifications).Error; err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

// UpdateBroadcastStats updates the statistics for a broadcast
func (s *NotificationService) UpdateBroadcastStats(broadcastID string) error {
	var stats struct {
		Sent      int64
		Delivered int64
		Failed    int64
	}

	db.DB.Model(&models.Notification{}).
		Where("broadcast_id = ? AND status = ?", broadcastID, "sent").
		Count(&stats.Sent)

	db.DB.Model(&models.Notification{}).
		Where("broadcast_id = ? AND status = ?", broadcastID, "delivered").
		Count(&stats.Delivered)

	db.DB.Model(&models.Notification{}).
		Where("broadcast_id = ? AND status = ?", broadcastID, "failed").
		Count(&stats.Failed)

	return db.DB.Model(&models.Broadcast{}).
		Where("id = ?", broadcastID).
		Updates(map[string]interface{}{
			"success_count": stats.Sent + stats.Delivered,
			"failure_count": stats.Failed,
		}).Error
}
