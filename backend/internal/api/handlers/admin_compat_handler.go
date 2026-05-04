package handlers

import (
	"encoding/json"
	"log"
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
	var dbSetting models.SystemSetting
	var settings map[string]interface{}

	// Safe DB access
	if db.DB == nil {
		log.Printf("ERROR: Database connection is not initialized in AdminSettings")
		settings = defaultSettings
	} else {
		if err := db.DB.Where("key = ?", "admin_settings").First(&dbSetting).Error; err == nil {
			// Found in DB, unmarshal
			if err := json.Unmarshal([]byte(dbSetting.Value), &settings); err != nil {
				log.Printf("WARN: Failed to unmarshal admin_settings in AdminSettings: %v", err)
				settings = defaultSettings
			}
		} else {
			// Not found, use defaults
			settings = defaultSettings
		}
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
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 { page = 1 }
	if limit <= 0 { limit = 10 }

	switch c.Request.Method {
	case http.MethodGet:
		var reports []models.ContentReport
		var total int64
		var pending int64
		var resolved int64

		query := db.DB.Model(&models.ContentReport{})
		if status := c.Query("status"); status != "" && status != "all" {
			query = query.Where("status = ?", status)
		}
		query.Count(&total)
		db.DB.Model(&models.ContentReport{}).Where("status = ?", "PENDING").Count(&pending)
		db.DB.Model(&models.ContentReport{}).Where("status = ?", "RESOLVED").Count(&resolved)

		query.Preload("Reporter").Order("\"createdAt\" DESC").Limit(limit).Offset((page-1)*limit).Find(&reports)

		api_response.Success(c, gin.H{
			"reports": reports,
			"items":   reports,
			"stats": gin.H{
				"pending":  pending,
				"resolved": resolved,
				"total":    total,
			},
			"pagination": gin.H{
				"page": page, "limit": limit, "total": total,
				"totalPages": (total + int64(limit) - 1) / int64(limit),
			},
		})

	case http.MethodPatch:
		var input struct {
			ID     string `json:"id" binding:"required"`
			Status string `json:"status"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		updates := map[string]interface{}{"status": input.Status}
		if input.Status == "RESOLVED" || input.Status == "DISMISSED" {
			now := time.Now()
			updates["resolvedAt"] = &now
			if userId, exists := c.Get("userId"); exists {
				uid := userId.(string)
				updates["resolvedBy"] = &uid
			}
		}
		db.DB.Model(&models.ContentReport{}).Where("id = ?", input.ID).Updates(updates)
		api_response.Success(c, nil)

	default:
		api_response.Success(c, gin.H{"reports": []interface{}{}, "stats": gin.H{"pending": 0, "resolved": 0, "total": 0}})
	}
}

func AdminBookReviews(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 { page = 1 }
	if limit <= 0 { limit = 10 }

	switch c.Request.Method {
	case http.MethodGet:
		// Check which endpoint was called
		isViewsEndpoint := c.FullPath() == "/api/admin/books/views"

		if isViewsEndpoint {
			// Return book view statistics from the Book model
			var books []models.Book
			var total int64
			db.DB.Model(&models.Book{}).Count(&total)
			db.DB.Order("views DESC").Limit(limit).Offset((page-1)*limit).Find(&books)

			var totalViews int64
			db.DB.Model(&models.Book{}).Select("COALESCE(SUM(views), 0)").Scan(&totalViews)

			items := make([]gin.H, 0, len(books))
			for _, b := range books {
				items = append(items, gin.H{
					"id": b.ID, "title": b.Title, "author": b.Author,
					"views": b.Views, "downloads": b.Downloads,
					"coverUrl": b.CoverUrl, "createdAt": b.CreatedAt,
				})
			}
			api_response.Success(c, gin.H{
				"views": items, "items": items,
				"pagination": gin.H{
					"page": page, "limit": limit, "total": total,
					"totalPages": (total + int64(limit) - 1) / int64(limit),
				},
				"stats": gin.H{"totalViews": totalViews},
			})
		} else {
			// Return course reviews (which also cover books)
			var reviews []models.CourseReview
			var total int64
			db.DB.Model(&models.CourseReview{}).Count(&total)
			db.DB.Preload("User").Order("\"createdAt\" DESC").Limit(limit).Offset((page-1)*limit).Find(&reviews)

			var avgRating float64
			db.DB.Model(&models.CourseReview{}).Select("COALESCE(AVG(rating), 0)").Scan(&avgRating)

			api_response.Success(c, gin.H{
				"reviews": reviews, "items": reviews,
				"pagination": gin.H{
					"page": page, "limit": limit, "total": total,
					"totalPages": (total + int64(limit) - 1) / int64(limit),
				},
				"stats": gin.H{"totalReviews": total, "avgRating": avgRating},
			})
		}

	case http.MethodDelete:
		var input struct { ID string `json:"id"` }
		if err := c.ShouldBindJSON(&input); err != nil || input.ID == "" {
			api_response.Error(c, http.StatusBadRequest, "ID is required")
			return
		}
		db.DB.Delete(&models.CourseReview{}, "id = ?", input.ID)
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
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 { page = 1 }
	if limit <= 0 { limit = 10 }

	switch c.Request.Method {
	case http.MethodGet:
		var campaigns []models.Campaign
		var total int64
		db.DB.Model(&models.Campaign{}).Count(&total)
		db.DB.Order("\"createdAt\" DESC").Limit(limit).Offset((page-1)*limit).Find(&campaigns)

		pagination := gin.H{
			"page": page, "limit": limit, "total": total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		}
		api_response.Success(c, gin.H{
			"campaigns": campaigns, "items": campaigns,
			"pagination": pagination,
		})

	case http.MethodPost:
		var item models.Campaign
		if err := c.ShouldBindJSON(&item); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		if err := db.DB.Create(&item).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to create campaign")
			return
		}
		api_response.Created(c, item)

	case http.MethodPatch, http.MethodPut:
		var input map[string]interface{}
		if err := c.ShouldBindJSON(&input); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		id, _ := input["id"].(string)
		if id == "" {
			api_response.Error(c, http.StatusBadRequest, "ID is required")
			return
		}
		var item models.Campaign
		if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
			api_response.Error(c, http.StatusNotFound, "Campaign not found")
			return
		}
		delete(input, "id")
		db.DB.Model(&item).Updates(input)
		api_response.Success(c, item)

	case http.MethodDelete:
		var input struct { ID string `json:"id"` }
		if err := c.ShouldBindJSON(&input); err != nil || input.ID == "" {
			api_response.Error(c, http.StatusBadRequest, "ID is required")
			return
		}
		db.DB.Delete(&models.Campaign{}, "id = ?", input.ID)
		api_response.Success(c, nil)

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
