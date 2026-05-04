package services

import (
	"fmt"
	"time"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

// SchedulerService handles scheduled item processing
type SchedulerService struct {
	quit chan struct{}
}

var schedulerServiceInstance *SchedulerService

// GetSchedulerService returns the singleton scheduler service
func GetSchedulerService() *SchedulerService {
	if schedulerServiceInstance == nil {
		schedulerServiceInstance = &SchedulerService{
			quit: make(chan struct{}),
		}
		// Start the background processor
		go schedulerServiceInstance.Start()
	}
	return schedulerServiceInstance
}

// Start begins the background scheduler
func (s *SchedulerService) Start() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.ProcessPendingItems()
		case <-s.quit:
			return
		}
	}
}

// Stop stops the scheduler
func (s *SchedulerService) Stop() {
	close(s.quit)
}

// ProcessPendingItems processes all pending items that are due
func (s *SchedulerService) ProcessPendingItems() {
	var items []models.ScheduledItem
	now := time.Now()

	db.DB.Where("status = ? AND scheduled_for <= ?", "pending", now).Find(&items)

	for _, item := range items {
		go s.ProcessItem(item.ID)
	}
}

// ProcessItem processes a single scheduled item
func (s *SchedulerService) ProcessItem(itemID string) error {
	var item models.ScheduledItem
	if err := db.DB.First(&item, "id = ?", itemID).Error; err != nil {
		return err
	}

	// Update status to processing
	item.Status = "processing"
	db.DB.Save(&item)

	// Process based on type
	var err error
	switch item.Type {
	case "announcement":
		err = s.processAnnouncement(item)
	case "exam":
		err = s.processExam(item)
	case "task":
		err = s.processTask(item)
	case "post":
		err = s.processPost(item)
	case "content":
		err = s.processContent(item)
	default:
		err = fmt.Errorf("unknown item type: %s", item.Type)
	}

	if err != nil {
		// Mark as failed
		item.Status = "failed"
		item.Error = err.Error()
		item.RetryCount++

		// Check if we should retry
		if item.RetryCount < item.MaxRetries {
			item.Status = "pending"
			// Reschedule for 5 minutes later
			item.ScheduledFor = time.Now().Add(5 * time.Minute)
		}
	} else {
		item.Status = "completed"
		now := time.Now()
		item.ExecutedAt = &now
	}

	return db.DB.Save(&item).Error
}

// processAnnouncement processes an announcement
func (s *SchedulerService) processAnnouncement(item models.ScheduledItem) error {
	// In production, this would create an announcement
	fmt.Printf("[Scheduler] Processing announcement: %s\n", item.Title)
	return nil
}

// processExam processes an exam schedule
func (s *SchedulerService) processExam(item models.ScheduledItem) error {
	// In production, this would publish an exam
	fmt.Printf("[Scheduler] Processing exam: %s\n", item.Title)
	return nil
}

// processTask processes a task schedule
func (s *SchedulerService) processTask(item models.ScheduledItem) error {
	// In production, this would publish a task
	fmt.Printf("[Scheduler] Processing task: %s\n", item.Title)
	return nil
}

// processPost processes a post schedule
func (s *SchedulerService) processPost(item models.ScheduledItem) error {
	// In production, this would publish a post
	fmt.Printf("[Scheduler] Processing post: %s\n", item.Title)
	return nil
}

// processContent processes content publishing
func (s *SchedulerService) processContent(item models.ScheduledItem) error {
	// In production, this would publish content
	fmt.Printf("[Scheduler] Processing content: %s\n", item.Title)
	return nil
}
