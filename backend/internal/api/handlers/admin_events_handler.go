package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)
const whereIDEquals = "id = ?"

// AdminGetEvents returns a paginated list of platform events
func AdminGetEvents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	var total int64
	query := db.DB.Model(&models.Event{})

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("title ILIKE ?", like)
	}

	query.Count(&total)

	var events []models.Event
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&events).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch events")
		return
	}

	items := make([]gin.H, 0, len(events))
	for _, e := range events {
		items = append(items, gin.H{
			"id":           e.ID,
			"title":        e.Title,
			"description":  e.Description,
			"type":         e.Type,
			"startDate":    e.StartDate,
			"endDate":      e.EndDate,
			"location":     e.Location,
			"isOnline":     e.IsOnline,
			"maxAttendees": e.MaxAttendees,
			"isActive":     e.IsActive,
			"createdAt":    e.CreatedAt,
			"_count": gin.H{
				"attendees": e.AttendeesCount,
			},
		})
	}

	pagination := api_response.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: (total + int64(limit) - 1) / int64(limit),
	}

	api_response.List(c, items, pagination, gin.H{
		"events": items,
	})
}

// AdminCreateEvent creates a new platform event
func AdminCreateEvent(c *gin.Context) {
	var input struct {
		Title        string  `json:"title" binding:"required"`
		Description  *string `json:"description"`
		Type         string  `json:"type"`
		StartDate    string  `json:"startDate" binding:"required"`
		EndDate      string  `json:"endDate" binding:"required"`
		Location     *string `json:"location"`
		IsOnline     bool    `json:"isOnline"`
		MaxAttendees *int    `json:"maxAttendees"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	startDate, err := parseFlexibleDate(input.StartDate)
	if err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid start date format")
		return
	}

	endDate, err := parseFlexibleDate(input.EndDate)
	if err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid end date format")
		return
	}

	eventType := input.Type
	if eventType == "" {
		eventType = "workshop"
	}

	event := models.Event{
		Title:        input.Title,
		Description:  input.Description,
		Type:         eventType,
		StartDate:    startDate,
		EndDate:      endDate,
		Location:     input.Location,
		IsOnline:     input.IsOnline,
		MaxAttendees: input.MaxAttendees,
		IsActive:     true,
	}

	if err := db.DB.Create(&event).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to create event")
		return
	}

	LogAudit(c, "CREATE", "event", event.ID, event)
	api_response.Created(c, event)
}

func AdminUpdateEvent(c *gin.Context) {
	var input struct {
		ID           string  `json:"id" binding:"required"`
		Title        *string `json:"title"`
		Description  *string `json:"description"`
		Type         *string `json:"type"`
		StartDate    *string `json:"startDate"`
		EndDate      *string `json:"endDate"`
		Location     *string `json:"location"`
		IsOnline     *bool   `json:"isOnline"`
		MaxAttendees *int    `json:"maxAttendees"`
		IsActive     *bool   `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var event models.Event
	if err := db.DB.First(&event, whereIDEquals, input.ID).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Event not found")
		return
	}

	type eventUpdates struct {
		Title        *string    `gorm:"column:title"`
		Description  *string    `gorm:"column:description"`
		Type         *string    `gorm:"column:type"`
		StartDate    *time.Time `gorm:"column:start_date"`
		EndDate      *time.Time `gorm:"column:end_date"`
		Location     *string    `gorm:"column:location"`
		IsOnline     *bool      `gorm:"column:is_online"`
		MaxAttendees *int       `gorm:"column:max_attendees"`
		IsActive     *bool      `gorm:"column:is_active"`
	}

	updates := eventUpdates{
		Title:        input.Title,
		Description:  input.Description,
		Type:         input.Type,
		Location:     input.Location,
		IsOnline:     input.IsOnline,
		MaxAttendees: input.MaxAttendees,
		IsActive:     input.IsActive,
	}

	if input.StartDate != nil {
		if t, err := parseFlexibleDate(*input.StartDate); err == nil {
			updates.StartDate = &t
		}
	}
	if input.EndDate != nil {
		if t, err := parseFlexibleDate(*input.EndDate); err == nil {
			updates.EndDate = &t
		}
	}

	if err := db.DB.Model(&models.Event{}).Where(whereIDEquals, event.ID).
		Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update event")
		return
	}

	LogAudit(c, "UPDATE", "event", input.ID, updates)
	api_response.Success(c, nil)
}



// AdminDeleteEvent deletes a platform event
func AdminDeleteEvent(c *gin.Context) {
	var input struct {
		ID string `json:"id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := db.DB.Delete(&models.Event{}, whereIDEquals, input.ID).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete event")
		return
	}

	LogAudit(c, "DELETE", "event", input.ID, nil)
	api_response.Success(c, nil)
}

// parseFlexibleDate parses dates in multiple formats
func parseFlexibleDate(dateStr string) (time.Time, error) {
	formats := []string{
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}
