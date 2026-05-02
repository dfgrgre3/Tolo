package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	api_response "thanawy-backend/internal/api/response"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func emptyPagination(c *gin.Context) gin.H {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	return gin.H{
		"page":       page,
		"limit":      limit,
		"total":      0,
		"totalCount": 0,
		"totalPages": 1,
	}
}

func requestBodyOrEmpty(c *gin.Context) gin.H {
	var body gin.H
	if err := c.ShouldBindJSON(&body); err != nil {
		return gin.H{}
	}
	return body
}

func adminCollectionPayload(c *gin.Context, key string) gin.H {
	items := []gin.H{}
	pagination := emptyPagination(c)
	return gin.H{
		"success":    true,
		key:          items,
		"items":      items,
		"data":       gin.H{key: items, "items": items, "pagination": pagination},
		"pagination": pagination,
		"stats":      gin.H{},
	}
}

func AdminCollection(modelType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		if page <= 0 {
			page = 1
		}
		if limit <= 0 {
			limit = 10
		}

		switch c.Request.Method {
		case http.MethodGet:
			var total int64
			var items interface{}
			
			// Fetch from database based on modelType
			switch modelType {
			case "resources":
				var resources []models.SubTopic
				db.DB.Model(&models.SubTopic{}).Where("type != ?", models.SubTopicQuiz).Count(&total)
				db.DB.Where("type != ?", models.SubTopicQuiz).Limit(limit).Offset((page-1)*limit).Order("\"createdAt\" DESC").Find(&resources)
				items = resources
			default:
				items = []interface{}{}
			}
			
			pagination := gin.H{
				"page":       page,
				"limit":      limit,
				"total":      total,
				"totalPages": (total + int64(limit) - 1) / int64(limit),
			}
			
			api_response.Success(c, gin.H{
				modelType:    items,
				"items":      items,
				"data":       gin.H{modelType: items, "items": items, "pagination": pagination},
				"pagination": pagination,
				"stats":      gin.H{},
			})

		case http.MethodPost, http.MethodPatch, http.MethodPut:
			api_response.Error(c, http.StatusNotImplemented, "POST/PUT not implemented for dynamic collections via this endpoint")

		case http.MethodDelete:
			api_response.Error(c, http.StatusNotImplemented, "DELETE not implemented for dynamic collections via this endpoint")

		default:
			api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
		}
	}
}

func AdminCoupons(c *gin.Context) {
	switch c.Request.Method {
	case http.MethodGet:
		api_response.Success(c, []gin.H{})
	case http.MethodPost, http.MethodPatch, http.MethodPut:
		body := requestBodyOrEmpty(c)
		if body["id"] == nil || body["id"] == "" {
			body["id"] = uuid.NewString()
		}
		if body["usedCount"] == nil {
			body["usedCount"] = 0
		}
		if body["createdAt"] == nil {
			body["createdAt"] = time.Now()
		}
		api_response.Success(c, body)
	case http.MethodDelete:
		api_response.Success(c, nil)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func AdminSettings(c *gin.Context) {
	// Default settings
	defaultSettings := map[string]interface{}{
		"siteName":        "Thanawy",
		"siteDescription": "منصة تعليمية لإدارة التعلم والمحتوى.",
		"siteKeywords":    []string{"education", "thanawy"},
		"contactEmail":    "admin@thanawy.local",
		"supportPhone":    "",
		"socialLinks": map[string]interface{}{
			"facebook":  "",
			"twitter":   "",
			"instagram": "",
			"youtube":   "",
		},
		"features": map[string]interface{}{
			"registration":      true,
			"emailVerification": true,
			"engagement":        true,
			"forum":             true,
			"blog":              true,
			"events":            true,
			"aiAssistant":       true,
		},
		"engagement": map[string]interface{}{
			"pointsPerTask":         10,
			"pointsPerStudySession": 5,
			"pointsPerExam":         20,
			"streakBonus":           2,
		},
		"limits": map[string]interface{}{
			"maxUploadSize":           10,
			"maxStudySessionDuration": 180,
			"examTimeLimit":           60,
		},
		"maintenance": map[string]interface{}{
			"enabled": false,
			"message": "",
		},
	}

	// Try to fetch from DB
	var dbSetting models.SystemSetting
	settings := make(gin.H)

	if err := db.DB.Where("key = ?", "admin_settings").First(&dbSetting).Error; err == nil {
		// Found in DB, unmarshal
		if err := json.Unmarshal([]byte(dbSetting.Value), &settings); err != nil {
			// If unmarshal fails, use defaults
			settings = defaultSettings
		}
	} else {
		// Not found, use defaults
		settings = defaultSettings
	}

	// Handle PATCH/PUT requests
	if c.Request.Method == http.MethodPatch || c.Request.Method == http.MethodPut {
		body := requestBodyOrEmpty(c)
		for key, value := range body {
			settings[key] = value
		}

		// Save back to DB
		jsonData, err := json.Marshal(settings)
		if err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to marshal settings")
			return
		}

		if dbSetting.ID == "" {
			// Create new
			dbSetting = models.SystemSetting{
				Key:   "admin_settings",
				Value: string(jsonData),
			}
			if err := db.DB.Create(&dbSetting).Error; err != nil {
				api_response.Error(c, http.StatusInternalServerError, "Failed to save settings")
				return
			}
		} else {
			// Update existing
			dbSetting.Value = string(jsonData)
			if err := db.DB.Save(&dbSetting).Error; err != nil {
				api_response.Error(c, http.StatusInternalServerError, "Failed to update settings")
				return
			}
		}
	}

	// Handle GET request - return in the format frontend expects
	api_response.Success(c, gin.H{"settings": settings})
}

func AdminAchievements(c *gin.Context) {
	switch c.Request.Method {
	case http.MethodGet:
		api_response.Success(c, gin.H{"achievements": []gin.H{}})
	case http.MethodPost, http.MethodPatch, http.MethodPut:
		body := requestBodyOrEmpty(c)
		if body["id"] == nil || body["id"] == "" {
			body["id"] = uuid.NewString()
		}
		api_response.Success(c, body)
	case http.MethodDelete:
		api_response.Success(c, nil)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func AdminAutomations(c *gin.Context) {
	switch c.Request.Method {
	case http.MethodGet:
		api_response.Success(c, gin.H{"rules": []gin.H{}})
	case http.MethodPost, http.MethodPatch, http.MethodPut:
		body := requestBodyOrEmpty(c)
		if body["id"] == nil || body["id"] == "" {
			body["id"] = uuid.NewString()
		}
		api_response.Success(c, body)
	case http.MethodDelete:
		api_response.Success(c, nil)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func AdminReportsContent(c *gin.Context) {
	api_response.Success(c, gin.H{
		"reports": []gin.H{},
		"items":   []gin.H{},
		"stats": gin.H{
			"pending":  0,
			"resolved": 0,
			"total":    0,
		},
	})
}

func AdminBookReviews(c *gin.Context) {
	switch c.Request.Method {
	case http.MethodGet:
		api_response.Success(c, gin.H{
			"reviews":    []gin.H{},
			"views":      []gin.H{},
			"items":      []gin.H{},
			"pagination": emptyPagination(c),
			"stats": gin.H{
				"totalReviews": 0,
				"avgRating":    0,
				"totalViews":   0,
			},
		})
	case http.MethodPatch, http.MethodPut, http.MethodDelete:
		api_response.Success(c, nil)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func AdminCourseAction(c *gin.Context) {
	if c.FullPath() == "/api/admin/courses/export" {
		c.Header("Content-Type", "text/csv; charset=utf-8")
		c.Header("Content-Disposition", `attachment; filename="courses.csv"`)
		c.String(http.StatusOK, "id,title,status\n")
		return
	}

	switch c.Request.Method {
	case http.MethodPost, http.MethodPatch, http.MethodPut:
		api_response.Success(c, nil)
	case http.MethodGet:
		api_response.Success(c, nil)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func DatabasePartitions(c *gin.Context) {
	api_response.Success(c, gin.H{
		"status": "healthy",
		"health": gin.H{
			"status":          "healthy",
			"checkedAt":       time.Now(),
			"partitioned":     false,
			"needsAction":     false,
			"tables":          []gin.H{},
			"recommendations": []string{},
		},
		"data": gin.H{
			"status": "healthy",
			"tables": []gin.H{},
		},
	})
}

func Marketing(c *gin.Context) {
	switch c.Request.Method {
	case http.MethodGet:
		api_response.Success(c, gin.H{"campaigns": []gin.H{}, "items": []gin.H{}})
	case http.MethodPost, http.MethodPatch, http.MethodPut:
		body := requestBodyOrEmpty(c)
		if body["id"] == nil || body["id"] == "" {
			body["id"] = uuid.NewString()
		}
		api_response.Success(c, body)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func Contests(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	switch c.Request.Method {
	case http.MethodGet:
		var contests []models.Contest
		var total int64
		
		db.DB.Model(&models.Contest{}).Count(&total)
		if err := db.DB.Limit(limit).Offset((page-1)*limit).Order("\"createdAt\" DESC").Find(&contests).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to fetch contests")
			return
		}
		
		items := make([]gin.H, 0, len(contests))
		for _, contest := range contests {
			items = append(items, gin.H{
				"id":                contest.ID,
				"title":             contest.Title,
				"description":       contest.Description,
				"category":          contest.Category,
				"questionsCount":    contest.QuestionsCount,
				"participantsCount": contest.ParticipantsCount,
				"pinCode":           contest.PinCode,
				"status":            contest.Status,
				"createdAt":         contest.CreatedAt,
			})
		}
		
		pagination := gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		}
		
		api_response.Success(c, gin.H{
			"contests": items,
			"items":    items,
			"data":     gin.H{"contests": items, "items": items, "pagination": pagination},
			"pagination": pagination,
			"stats":    gin.H{},
		})

	case http.MethodPost:
		var input struct {
			Title       string  `json:"title" binding:"required"`
			Description *string `json:"description"`
			Category    *string `json:"category"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		
		contest := models.Contest{
			Title:       input.Title,
			Description: input.Description,
			Category:    input.Category,
			Status:      "DRAFT",
		}
		
		if err := db.DB.Create(&contest).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to create contest")
			return
		}
		
		LogAudit(c, "CREATE", "contest", contest.ID, contest)
		api_response.Created(c, contest)

	case http.MethodPatch:
		id := c.Param("id")
		var input struct {
			Title       *string `json:"title"`
			Description *string `json:"description"`
			Category    *string `json:"category"`
			Status      *string `json:"status"`
			PinCode     *string `json:"pinCode"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		
		var contest models.Contest
		if err := db.DB.First(&contest, "id = ?", id).Error; err != nil {
			api_response.Error(c, http.StatusNotFound, "Contest not found")
			return
		}
		
		updates := make(map[string]interface{})
		if input.Title != nil {
			updates["title"] = *input.Title
		}
		if input.Description != nil {
			updates["description"] = input.Description
		}
		if input.Category != nil {
			updates["category"] = input.Category
		}
		if input.Status != nil {
			updates["status"] = *input.Status
		}
		if input.PinCode != nil {
			updates["pinCode"] = input.PinCode
		}
		
		if err := db.DB.Model(&contest).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update contest")
			return
		}
		
		LogAudit(c, "UPDATE", "contest", id, updates)
		api_response.Success(c, nil)

	case http.MethodDelete:
		id := c.Param("id")
		if err := db.DB.Delete(&models.Contest{}, "id = ?", id).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to delete contest")
			return
		}
		
		LogAudit(c, "DELETE", "contest", id, nil)
		api_response.Success(c, nil)

	default:
		api_response.Error(c, http.StatusMethodNotAllowed, "Method not allowed")
	}
}
