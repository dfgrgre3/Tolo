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

const channelInApp = "in-app"
const errTicketNotFound = "Ticket not found"

// CreateTicketRequest represents a request to create a support ticket
type CreateTicketRequest struct {
	UserID            string `json:"userId" binding:"required"`
	Subject           string `json:"subject" binding:"required,max=200"`
	Description       string `json:"description" binding:"required,max=5000"`
	Category          string `json:"category" binding:"required,oneof=technical billing content account other"`
	Priority          string `json:"priority" binding:"omitempty,oneof=low medium high urgent"`
	RelatedEntityType string `json:"relatedEntityType,omitempty"`
	RelatedEntityID   string `json:"relatedEntityId,omitempty"`
}

// SendMessageRequest represents a message to be sent
type SendMessageRequest struct {
	Message    string `json:"message" binding:"required,max=5000"`
	IsInternal bool   `json:"isInternal"`
}

// UpdateTicketStatusRequest represents a status update
type UpdateTicketStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=open in_progress resolved closed escalated"`
}

// UpdateTicketPriorityRequest represents a priority update
type UpdateTicketPriorityRequest struct {
	Priority string `json:"priority" binding:"required,oneof=low medium high urgent"`
}

// CreateSupportTicket creates a new support ticket (admin-initiated)
// @Summary Create support ticket
// @Description Create a new support ticket on behalf of a user
// @Tags admin,support
// @Accept json
// @Produce json
// @Param request body CreateTicketRequest true "Ticket details"
// @Success 201 {object} map[string]interface{}
// @Router /api/admin/tickets [post]
func CreateSupportTicket(c *gin.Context) {
	var req CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminIDVal, _ := c.Get("userId")
	senderID := "00000000-0000-0000-0000-000000000000"
	if v, ok := adminIDVal.(string); ok && v != "" {
		senderID = v
	}

	// Set default priority
	if req.Priority == "" {
		req.Priority = "medium"
	}

	// Generate ticket number
	ticketNumber := services.GenerateTicketNumber()

	// Get user info
	var user models.User
	if err := db.DB.First(&user, idQuery, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	ticket := models.SupportTicket{
		TicketNumber:      ticketNumber,
		UserID:            req.UserID,
		UserName:          user.GetName(),
		UserEmail:         user.Email,
		Subject:           req.Subject,
		Description:       req.Description,
		Category:          req.Category,
		Status:            "open",
		Priority:          req.Priority,
		RelatedEntityType: req.RelatedEntityType,
		RelatedEntityID:   req.RelatedEntityID,
		Tags:              []string{},
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := SafeCreate(db.DB, &ticket); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ticket"})
		return
	}

	// Log operation
	middleware.LogCriticalOperation(c, "ticket_created", map[string]interface{}{
		"ticket_number": ticketNumber,
		"user_id":       req.UserID,
		"category":      req.Category,
	})

	// Create initial system message
	systemMessage := models.TicketMessage{
		TicketID:   ticket.ID,
		SenderID:   senderID,
		SenderName: "System",
		SenderRole: "system",
		Message:    "Ticket created by admin",
		IsInternal: true,
		CreatedAt:  time.Now(),
	}
	SafeCreate(db.DB, &systemMessage)

	// Notify user
	services.GetNotificationService().QueueNotification(models.Notification{
		UserID:   req.UserID,
		Title:    "New Support Ticket",
		Message:  "A support ticket has been created for you: " + req.Subject,
		Type:     "info",
		Channels: []string{channelInApp, "email"},
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": "Ticket created successfully",
		"data": gin.H{
			"ticket": ticket,
		},
	})
}

// GetSupportTickets returns all support tickets with filtering
// @Summary Get support tickets
// @Description Get all support tickets with optional filtering
// @Tags admin,support
// @Accept json
// @Produce json
// @Param status query string false "Filter by status"
// @Param priority query string false "Filter by priority"
// @Param category query string false "Filter by category"
// @Param assignedTo query string false "Filter by assignee"
// @Param search query string false "Search in subject/description"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/tickets [get]
func GetSupportTickets(c *gin.Context) {
	status := c.Query("status")
	priority := c.Query("priority")
	category := c.Query("category")
	assignedTo := c.Query("assignedTo")
	search := c.Query("search")
	from := c.Query("from")
	to := c.Query("to")

	query := db.DB.Model(&models.SupportTicket{}).Preload("Messages").Order("updated_at DESC")

	if status != "" {
		query = query.Where(statusQuery, status)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if assignedTo != "" {
		query = query.Where("assigned_to = ?", assignedTo)
	}
	if search != "" {
		query = query.Where("subject ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
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

	var tickets []models.SupportTicket
	if err := query.Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tickets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"tickets": tickets,
			"count":   len(tickets),
		},
	})
}

// GetSupportTicket returns a single ticket with messages
// @Summary Get support ticket
// @Description Get a specific support ticket with all messages
// @Tags admin,support
// @Accept json
// @Produce json
// @Param id path string true "Ticket ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/tickets/{id} [get]
func GetSupportTicket(c *gin.Context) {
	id := c.Param("id")

	var ticket models.SupportTicket
	if err := db.DB.Preload("Messages").First(&ticket, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errTicketNotFound})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"ticket": ticket,
		},
	})
}

// SendTicketMessage sends a message on a ticket
// @Summary Send ticket message
// @Description Send a message on a support ticket
// @Tags admin,support
// @Accept json
// @Produce json
// @Param id path string true "Ticket ID"
// @Param request body SendMessageRequest true "Message details"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/tickets/{id}/messages [post]
func SendTicketMessage(c *gin.Context) {
	id := c.Param("id")
	adminIDVal, _ := c.Get("userId")
	senderID := ""
	if v, ok := adminIDVal.(string); ok {
		senderID = v
	}

	senderName := getAdminSenderName(senderID)

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var ticket models.SupportTicket
	if err := db.DB.First(&ticket, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errTicketNotFound})
		return
	}

	// Update ticket status if it's the first admin response
	updateTicketStatusOnResponse(&ticket, req.IsInternal)

	// Create message
	message := models.TicketMessage{
		TicketID:   id,
		SenderID:   senderID,
		SenderName: senderName,
		SenderRole: "admin",
		Message:    req.Message,
		IsInternal: req.IsInternal,
		CreatedAt:  time.Now(),
	}

	if err := SafeCreate(db.DB, &message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Notify user if not internal
	if !req.IsInternal {
		notifyUserOfTicketResponse(ticket)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Message sent successfully",
		"data": gin.H{
			"message": message,
		},
	})
}

func getAdminSenderName(senderID string) string {
	senderName := "Admin"
	if senderID == "" {
		return senderName
	}

	var adminUser models.User
	if err := db.DB.First(&adminUser, idQuery, senderID).Error; err != nil {
		return senderName
	}

	if adminUser.Name != nil && *adminUser.Name != "" {
		return *adminUser.Name
	}
	if adminUser.Username != nil && *adminUser.Username != "" {
		return *adminUser.Username
	}
	return adminUser.Email
}

func updateTicketStatusOnResponse(ticket *models.SupportTicket, isInternal bool) {
	if ticket.Status == "open" && !isInternal {
		ticket.Status = "in_progress"
	}
	ticket.UpdatedAt = time.Now()
	db.DB.Save(ticket)
}

func notifyUserOfTicketResponse(ticket models.SupportTicket) {
	services.GetNotificationService().QueueNotification(models.Notification{
		UserID:   ticket.UserID,
		Title:    "New Response on Your Ticket",
		Message:  "Admin has responded to your ticket: " + ticket.Subject,
		Type:     "info",
		Channels: []string{channelInApp, "email"},
	})
}

// UpdateTicketStatus updates the status of a ticket
// @Summary Update ticket status
// @Description Update the status of a support ticket
// @Tags admin,support
// @Accept json
// @Produce json
// @Param id path string true "Ticket ID"
// @Param request body UpdateTicketStatusRequest true "Status update"
// @Success 200 {object} map[string]string
// @Router /api/admin/tickets/{id}/status [patch]
func UpdateTicketStatus(c *gin.Context) {
	id := c.Param("id")

	var req UpdateTicketStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var ticket models.SupportTicket
	if err := db.DB.First(&ticket, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errTicketNotFound})
		return
	}

	type ticketUpdates struct {
		Status     *string    `gorm:"column:status"`
		UpdatedAt  *time.Time `gorm:"column:updated_at"`
		ResolvedAt *time.Time `gorm:"column:resolved_at"`
		ClosedAt   *time.Time `gorm:"column:closed_at"`
	}

	now := time.Now()
	updates := ticketUpdates{
		Status:    &req.Status,
		UpdatedAt: &now,
	}

	// Set timestamps based on status
	if req.Status == "resolved" {
		updates.ResolvedAt = &now
	}
	if req.Status == "closed" {
		updates.ClosedAt = &now
	}

	if err := db.DB.Model(&models.SupportTicket{}).Where(idQuery, ticket.ID).
		Updates(&updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	// Notify user of status change
	services.GetNotificationService().QueueNotification(models.Notification{
		UserID:   ticket.UserID,
		Title:    "Ticket Status Updated",
		Message:  "Your ticket '" + ticket.Subject + "' is now " + req.Status,
		Type:     "info",
		Channels: []string{channelInApp},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

// UpdateTicketPriority updates the priority of a ticket
// @Summary Update ticket priority
// @Description Update the priority of a support ticket
// @Tags admin,support
// @Accept json
// @Produce json
// @Param id path string true "Ticket ID"
// @Param request body UpdateTicketPriorityRequest true "Priority update"
// @Success 200 {object} map[string]string
// @Router /api/admin/tickets/{id}/priority [patch]
func UpdateTicketPriority(c *gin.Context) {
	id := c.Param("id")

	var req UpdateTicketPriorityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Model(&models.SupportTicket{}).
		Where(idQuery, id).
		Updates(map[string]interface{}{
			"priority":   req.Priority,
			"updated_at": time.Now(),
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update priority"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Priority updated successfully"})
}

// AssignTicket assigns a ticket to an admin
// @Summary Assign ticket
// @Description Assign a support ticket to an admin
// @Tags admin,support
// @Accept json
// @Produce json
// @Param id path string true "Ticket ID"
// @Param request body map[string]string true "Admin ID to assign to"
// @Success 200 {object} map[string]string
// @Router /api/admin/tickets/{id}/assign [post]
func AssignTicket(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		AdminID string `json:"adminId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get admin name
	var admin models.User
	if err := db.DB.First(&admin, idQuery, req.AdminID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Admin not found"})
		return
	}

	if err := db.DB.Model(&models.SupportTicket{}).
		Where(idQuery, id).
		Updates(map[string]interface{}{
			"assigned_to":      req.AdminID,
			"assigned_to_name": admin.GetName(),
			"updated_at":       time.Now(),
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign ticket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ticket assigned successfully"})
}

// CloseTicket closes a support ticket
// @Summary Close ticket
// @Description Close a support ticket permanently
// @Tags admin,support
// @Accept json
// @Produce json
// @Param id path string true "Ticket ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/tickets/{id}/close [post]
func CloseTicket(c *gin.Context) {
	id := c.Param("id")

	if err := db.DB.Model(&models.SupportTicket{}).
		Where(idQuery, id).
		Updates(map[string]interface{}{
			"status":     "closed",
			"closed_at":  time.Now(),
			"updated_at": time.Now(),
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to close ticket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ticket closed successfully"})
}

// GetTicketStats returns ticket statistics
// @Summary Get ticket statistics
// @Description Get statistics about support tickets
// @Tags admin,support
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/tickets/stats [get]
func GetTicketStats(c *gin.Context) {
	var stats struct {
		Total      int64 `json:"total"`
		Open       int64 `json:"open"`
		InProgress int64 `json:"inProgress"`
		Resolved   int64 `json:"resolved"`
		Closed     int64 `json:"closed"`
		Unassigned int64 `json:"unassigned"`
		Urgent     int64 `json:"urgent"`
	}

	db.DB.Model(&models.SupportTicket{}).Count(&stats.Total)
	db.DB.Model(&models.SupportTicket{}).Where(statusQuery, "open").Count(&stats.Open)
	db.DB.Model(&models.SupportTicket{}).Where(statusQuery, "in_progress").Count(&stats.InProgress)
	db.DB.Model(&models.SupportTicket{}).Where(statusQuery, "resolved").Count(&stats.Resolved)
	db.DB.Model(&models.SupportTicket{}).Where(statusQuery, "closed").Count(&stats.Closed)
	db.DB.Model(&models.SupportTicket{}).Where("assigned_to IS NULL").Count(&stats.Unassigned)
	db.DB.Model(&models.SupportTicket{}).Where("priority = ?", "urgent").Count(&stats.Urgent)

	// Average resolution time (for resolved tickets in last 30 days)
	var avgResolutionTime float64
	db.DB.Raw(`
		SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
		FROM support_tickets
		WHERE status = 'resolved'
		AND resolved_at >= NOW() - INTERVAL '30 days'
	`).Scan(&avgResolutionTime)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"overview":          stats,
			"avgResolutionTime": avgResolutionTime,
		},
	})
}
