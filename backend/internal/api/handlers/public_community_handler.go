package handlers

import (
	"net/http"
	"strings"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetPublicAnnouncements(c *gin.Context) {
	var notifications []models.Notification
	if err := db.DB.Order("created_at DESC").Limit(50).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}

	items := make([]gin.H, 0, len(notifications))
	for _, n := range notifications {
		items = append(items, gin.H{
			"id":          n.ID,
			"title":       n.Title,
			"content":     n.Message,
			"publishedAt": n.CreatedAt,
			"priority":    strings.ToLower(defaultString(n.Priority, "medium")),
			"category":    strings.ToLower(defaultString(n.Category, "general")),
			"authorName":  "System",
			"tags":        []string{},
			"views":       0,
		})
	}

	c.JSON(http.StatusOK, items)
}

func CreatePublicAnnouncement(c *gin.Context) {
	userID := c.GetString("userId")
	var input struct {
		Title    string   `json:"title"`
		Content  string   `json:"content"`
		Priority string   `json:"priority"`
		Category string   `json:"category"`
		Tags     []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.Title = strings.TrimSpace(input.Title)
	input.Content = strings.TrimSpace(input.Content)
	if input.Title == "" || input.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title and content are required"})
		return
	}

	notification := models.Notification{
		UserID:   userID,
		Title:    input.Title,
		Message:  input.Content,
		Type:     models.NotificationInfo,
		Category: strings.ToUpper(defaultString(input.Category, "general")),
		Priority: strings.ToUpper(defaultString(input.Priority, "medium")),
		IsRead:   false,
	}
	if err := SafeCreate(db.DB, &notification); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": notification.ID})
}

func GetChatConversations(c *gin.Context) {
	c.JSON(http.StatusOK, []gin.H{})
}

func GetChatMessages(c *gin.Context) {
	c.JSON(http.StatusOK, []gin.H{})
}

func SendChatMessage(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
