package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
)

const errItemNotFound = "Item not found"

// ScheduledItemRequest represents a request to schedule an item
type ScheduledItemRequest struct {
	Type         string                 `json:"type" binding:"required,oneof=announcement exam task post content"`
	Title        string                 `json:"title" binding:"required,max=200"`
	Description  string                 `json:"description" binding:"max=1000"`
	Content      map[string]interface{} `json:"content" binding:"required"`
	ScheduledFor time.Time              `json:"scheduledFor" binding:"required"`
	Timezone     string                 `json:"timezone" binding:"omitempty"`
	Frequency    string                 `json:"frequency" binding:"omitempty,oneof=once daily weekly monthly"`
	MaxRetries   int                    `json:"maxRetries" binding:"omitempty,min=0,max=5"`
}

// CreateScheduledItem creates a new scheduled item
// @Summary Schedule item for future execution
// @Description Schedule announcements, exams, tasks, or content for automatic publishing
// @Tags admin,scheduler
// @Accept json
// @Produce json
// @Param request body ScheduledItemRequest true "Schedule details"
// @Success 201 {object} map[string]interface{}
// @Router /api/admin/scheduler [post]
func CreateScheduledItem(c *gin.Context) {
	var req ScheduledItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.Timezone == "" {
		req.Timezone = "UTC"
	}
	if req.Frequency == "" {
		req.Frequency = "once"
	}
	if req.MaxRetries == 0 {
		req.MaxRetries = 3
	}

	// Validate timezone
	loc, err := time.LoadLocation(req.Timezone)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid timezone: " + req.Timezone})
		return
	}

	// Validate scheduledFor is in the future
	nowInLoc := time.Now().In(loc)
	scheduledInLoc := req.ScheduledFor.In(loc)
	if !scheduledInLoc.After(nowInLoc) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scheduledFor must be in the future"})
		return
	}

	// Get admin info
	adminID, _ := c.Get("user_id")

	// Create scheduled item
	item := models.ScheduledItem{
		Type:         req.Type,
		Title:        req.Title,
		Description:  req.Description,
		Content:      req.Content,
		ScheduledFor: req.ScheduledFor,
		Timezone:     req.Timezone,
		Frequency:    req.Frequency,
		Status:       "pending",
		MaxRetries:   req.MaxRetries,
		RetryCount:   0,
		CreatedBy:    adminID.(string),
		CreatedAt:    time.Now(),
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create schedule"})
		return
	}

	// Log operation
	middleware.LogCriticalOperation(c, "scheduler_create", map[string]interface{}{
		"type":      req.Type,
		"title":     req.Title,
		"scheduled": req.ScheduledFor,
		"frequency": req.Frequency,
	})

	// If scheduled for immediate execution (within 1 minute), process now
	if time.Until(req.ScheduledFor) <= time.Minute {
		go services.GetSchedulerService().ProcessItem(item.ID)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Item scheduled successfully",
		"data": gin.H{
			"item": item,
		},
	})
}

// GetScheduledItems returns all scheduled items with filtering
// @Summary Get scheduled items
// @Description Get all scheduled items with optional filtering
// @Tags admin,scheduler
// @Accept json
// @Produce json
// @Param type query string false "Filter by type"
// @Param status query string false "Filter by status"
// @Param from query string false "Filter from date"
// @Param to query string false "Filter to date"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/scheduler [get]
func GetScheduledItems(c *gin.Context) {
	itemType := c.Query("type")
	status := c.Query("status")
	from := c.Query("from")
	to := c.Query("to")

	query := db.DB.Model(&models.ScheduledItem{}).Order("scheduled_for ASC")

	if itemType != "" {
		query = query.Where("type = ?", itemType)
	}
	if status != "" {
		query = query.Where(statusQuery, status)
	}
	if from != "" {
		if fromTime, err := time.Parse(time.RFC3339, from); err == nil {
			query = query.Where("scheduled_for >= ?", fromTime)
		}
	}
	if to != "" {
		if toTime, err := time.Parse(time.RFC3339, to); err == nil {
			query = query.Where("scheduled_for <= ?", toTime)
		}
	}

	var items []models.ScheduledItem
	if err := query.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch items"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"items": items,
			"count": len(items),
		},
	})
}

// CancelScheduledItem cancels a pending scheduled item
// @Summary Cancel scheduled item
// @Description Cancel a pending scheduled item
// @Tags admin,scheduler
// @Accept json
// @Produce json
// @Param id path string true "Item ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/scheduler/{id}/cancel [post]
func CancelScheduledItem(c *gin.Context) {
	id := c.Param("id")

	var item models.ScheduledItem
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errItemNotFound})
		return
	}

	// Can only cancel pending items
	if item.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only cancel pending items"})
		return
	}

	item.Status = "cancelled"
	now := time.Now()
	item.CancelledAt = &now

	if err := db.DB.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item cancelled successfully"})
}

// RetryScheduledItem retries a failed scheduled item
// @Summary Retry failed item
// @Description Retry execution of a failed scheduled item
// @Tags admin,scheduler
// @Accept json
// @Produce json
// @Param id path string true "Item ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/scheduler/{id}/retry [post]
func RetryScheduledItem(c *gin.Context) {
	id := c.Param("id")

	var item models.ScheduledItem
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errItemNotFound})
		return
	}

	// Can only retry failed items
	if item.Status != "failed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only retry failed items"})
		return
	}

	// Check retry limit
	if item.RetryCount >= item.MaxRetries {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum retry attempts reached"})
		return
	}

	item.Status = "pending"
	item.Error = ""

	if err := db.DB.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retry item"})
		return
	}

	// Trigger immediate processing
	go services.GetSchedulerService().ProcessItem(item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Item queued for retry",
		"data": gin.H{
			"retryCount": item.RetryCount + 1,
		},
	})
}

// ExecuteScheduledItemNow executes a scheduled item immediately
// @Summary Execute item now
// @Description Execute a scheduled item immediately regardless of scheduled time
// @Tags admin,scheduler
// @Accept json
// @Produce json
// @Param id path string true "Item ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/scheduler/{id}/execute [post]
func ExecuteScheduledItemNow(c *gin.Context) {
	id := c.Param("id")

	var item models.ScheduledItem
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errItemNotFound})
		return
	}

	if item.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only execute pending items"})
		return
	}

	// Update status to processing
	item.Status = "processing"
	db.DB.Save(&item)

	// Process synchronously for immediate feedback
	err := services.GetSchedulerService().ProcessItem(item.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item executed successfully"})
}

// DeleteScheduledItem deletes a scheduled item
// @Summary Delete scheduled item
// @Description Delete a scheduled item permanently
// @Tags admin,scheduler
// @Accept json
// @Produce json
// @Param id path string true "Item ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/scheduler/{id} [delete]
func DeleteScheduledItem(c *gin.Context) {
	id := c.Param("id")

	// Prevent deleting processing items
	var item models.ScheduledItem
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errItemNotFound})
		return
	}

	if item.Status == "processing" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete processing item"})
		return
	}

	if err := db.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item deleted successfully"})
}

// GetSchedulerStats returns scheduler statistics
// @Summary Get scheduler statistics
// @Description Get statistics about scheduled items
// @Tags admin,scheduler
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/scheduler/stats [get]
func GetSchedulerStats(c *gin.Context) {
	var stats struct {
		Total     int64 `json:"total"`
		Pending   int64 `json:"pending"`
		Completed int64 `json:"completed"`
		Failed    int64 `json:"failed"`
		Cancelled int64 `json:"cancelled"`
	}

	db.DB.Model(&models.ScheduledItem{}).Count(&stats.Total)
	db.DB.Model(&models.ScheduledItem{}).Where(statusQuery, "pending").Count(&stats.Pending)
	db.DB.Model(&models.ScheduledItem{}).Where(statusQuery, "completed").Count(&stats.Completed)
	db.DB.Model(&models.ScheduledItem{}).Where(statusQuery, "failed").Count(&stats.Failed)
	db.DB.Model(&models.ScheduledItem{}).Where(statusQuery, "cancelled").Count(&stats.Cancelled)

	// Get upcoming items (next 24 hours)
	var upcoming int64
	db.DB.Model(&models.ScheduledItem{}).
		Where("status = ? AND scheduled_for <= ?", "pending", time.Now().Add(24*time.Hour)).
		Count(&upcoming)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"overview": stats,
			"upcoming": upcoming,
		},
	})
}
