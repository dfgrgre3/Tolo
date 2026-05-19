package handlers

import (
	"net/http"
	"strconv"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog

	var eventTypes []string
	db.DB.Model(&models.AuditLog{}).Distinct().Pluck("event_type", &eventTypes)

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
	query := db.DB.Model(&models.AuditLog{})

	if et := c.Query("eventType"); et != "" && et != "all" {
		query = query.Where("event_type = ?", et)
	}
	if uid := c.Query("userId"); uid != "" {
		query = query.Where("user_id = ?", uid)
	}

	query.Count(&total)

	if err := query.Preload("User").Limit(limit).Offset(offset).Order("created_at DESC").Find(&logs).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch logs")
		return
	}

	pagination := api_response.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: (total + int64(limit) - 1) / int64(limit),
	}

	api_response.List(c, logs, pagination, gin.H{
		"logs":       logs,
		"eventTypes": eventTypes,
	})
}

func GetPublicBlogPosts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	var posts []models.BlogPost
	var total int64
	query := db.DB.Model(&models.BlogPost{}).Where("status = ?", "PUBLISHED")
	query.Count(&total)
	query.Preload("Author").Order("published_at DESC").Limit(limit).Offset((page - 1) * limit).Find(&posts)

	api_response.Success(c, gin.H{
		"posts": posts,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

func GetPublicBlogPost(c *gin.Context) {
	slug := c.Param("slug")
	var post models.BlogPost
	if err := db.DB.Preload("Author").Where("slug = ? AND status = ?", slug, "PUBLISHED").First(&post).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Blog post not found")
		return
	}
	db.DB.Model(&post).UpdateColumn("views", post.Views+1)
	api_response.Success(c, post)
}

func GetPublicEvents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	var events []models.Event
	var total int64
	query := db.DB.Model(&models.Event{}).Where(isActiveQuery, true)
	query.Count(&total)
	query.Order("start_date ASC").Limit(limit).Offset((page - 1) * limit).Find(&events)

	api_response.Success(c, gin.H{
		"events": events,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
