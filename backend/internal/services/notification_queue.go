package services

import (
	"log"
	"sync"
	"thanawy-backend/internal/models"
)

// NotificationQueueService handles asynchronous notification processing
type NotificationQueueService struct {
	// For now, use a simple channel-based queue
	// In production, this could be backed by Redis/BullMQ
	queue chan models.Notification
	mu    sync.Mutex
}

var notificationQueueInstance *NotificationQueueService
var queueOnce sync.Once

// GetNotificationQueueService returns the singleton queue service
func GetNotificationQueueService() *NotificationQueueService {
	queueOnce.Do(func() {
		notificationQueueInstance = &NotificationQueueService{
			queue: make(chan models.Notification, 1000),
		}
		// Start worker
		go notificationQueueInstance.processQueue()
	})
	return notificationQueueInstance
}

// Enqueue adds a notification to the processing queue
func (s *NotificationQueueService) Enqueue(notification models.Notification) error {
	select {
	case s.queue <- notification:
		return nil
	default:
		log.Printf("Warning: Notification queue full, dropping notification for user %s", notification.UserID)
		return nil // Non-blocking
	}
}

// processQueue handles notifications from the channel
func (s *NotificationQueueService) processQueue() {
	log.Println("Notification queue processor started")
	for notification := range s.queue {
		// Process notification (send push, email, etc.)
		log.Printf("Processing notification: %s for user %s", notification.Title, notification.UserID)

		// Here you would call other services like EmailService or PushNotificationService
		// For now, we just log it
	}
}
