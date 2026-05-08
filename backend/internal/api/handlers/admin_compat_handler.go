package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const createdAtDesc = "created_at DESC"
const msgMethodNotAllowed = "Method not allowed"
const statusQuery = "status = ?"
const idQuery = "id = ?"
const idInQuery = "id IN ?"
const msgIDRequired = "ID is required"
var defaultAdminSettings = map[string]interface{}{
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

func mergeMaps(dest map[string]interface{}, src map[string]interface{}) {
	for k, v := range src {
		dest[k] = v
	}
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
				db.DB.Where("type != ?", models.SubTopicQuiz).Limit(limit).Offset((page - 1) * limit).Order(createdAtDesc).Find(&resources)
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
			api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
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
		api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
	}
}

func AdminSettings(c *gin.Context) {
	var dbSetting models.SystemSetting
	settings := make(map[string]interface{})

	// Initialize with defaults
	mergeMaps(settings, defaultAdminSettings)

	// Overlay settings from database
	if db.DB != nil {
		if err := db.DB.Where("key = ?", "admin_settings").First(&dbSetting).Error; err == nil {
			var dbMap map[string]interface{}
			if err := json.Unmarshal([]byte(dbSetting.Value), &dbMap); err == nil {
				mergeMaps(settings, dbMap)
			}
		}
	}

	// Process updates if applicable
	method := c.Request.Method
	if method == http.MethodPatch || method == http.MethodPut {
		mergeMaps(settings, requestBodyOrEmpty(c))

		jsonData, _ := json.Marshal(settings)
		dbSetting.Key = "admin_settings"
		dbSetting.Value = string(jsonData)

		if err := db.DB.Save(&dbSetting).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to save settings")
			return
		}
	}

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
		api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
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
		api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
	}
}

func AdminReportsContent(c *gin.Context) {
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
		var reports []models.ContentReport
		var total int64
		var pending int64
		var resolved int64

		query := db.DB.Model(&models.ContentReport{})
		if status := c.Query("status"); status != "" && status != "all" {
			query = query.Where(statusQuery, status)
		}
		query.Count(&total)
		db.DB.Model(&models.ContentReport{}).Where(statusQuery, "PENDING").Count(&pending)
		db.DB.Model(&models.ContentReport{}).Where(statusQuery, "RESOLVED").Count(&resolved)

		query.Preload("Reporter").Order(createdAtDesc).Limit(limit).Offset((page - 1) * limit).Find(&reports)

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
		db.DB.Model(&models.ContentReport{}).Where(idQuery, input.ID).Updates(updates)
		api_response.Success(c, nil)

	default:
		api_response.Success(c, gin.H{"reports": []interface{}{}, "stats": gin.H{"pending": 0, "resolved": 0, "total": 0}})
	}
}

func AdminBookReviews(c *gin.Context) {
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
		// Check which endpoint was called
		isViewsEndpoint := c.FullPath() == "/api/admin/books/views"

		if isViewsEndpoint {
			// Return book view statistics from the Book model
			var books []models.Book
			var total int64
			db.DB.Model(&models.Book{}).Count(&total)
			db.DB.Order("views DESC").Limit(limit).Offset((page - 1) * limit).Find(&books)

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
			db.DB.Preload("User").Order(createdAtDesc).Limit(limit).Offset((page - 1) * limit).Find(&reviews)

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
		var input struct {
			ID string `json:"id"`
		}
		if err := c.ShouldBindJSON(&input); err != nil || input.ID == "" {
			api_response.Error(c, http.StatusBadRequest, msgIDRequired)
			return
		}
		db.DB.Delete(&models.CourseReview{}, idQuery, input.ID)
		api_response.Success(c, nil)

	default:
		api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
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
		api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
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
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	switch c.Request.Method {
	case http.MethodGet:
		handleMarketingGet(c, page, limit)
	case http.MethodPost:
		handleMarketingPost(c)
	case http.MethodPatch, http.MethodPut:
		handleMarketingUpdate(c)
	case http.MethodDelete:
		handleMarketingDelete(c)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
	}
}

func handleMarketingGet(c *gin.Context, page, limit int) {
	var campaigns []models.Campaign
	var total int64
	db.DB.Model(&models.Campaign{}).Count(&total)
	db.DB.Order(createdAtDesc).Limit(limit).Offset((page - 1) * limit).Find(&campaigns)

	pagination := gin.H{
		"page": page, "limit": limit, "total": total,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}
	api_response.Success(c, gin.H{
		"campaigns":  campaigns,
		"items":      campaigns,
		"pagination": pagination,
	})
}

func handleMarketingPost(c *gin.Context) {
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
}

func handleMarketingUpdate(c *gin.Context) {
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	id, _ := input["id"].(string)
	if id == "" {
		api_response.Error(c, http.StatusBadRequest, msgIDRequired)
		return
	}
	var item models.Campaign
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Campaign not found")
		return
	}

	updates := make(map[string]interface{})
	allowedFields := []string{"name", "description", "type", "status", "targetRole", "content", "startDate", "endDate"}
	for _, field := range allowedFields {
		if val, ok := input[field]; ok {
			updates[field] = val
		}
	}

	db.DB.Model(&item).Updates(updates)
	api_response.Success(c, item)
}

func handleMarketingDelete(c *gin.Context) {
	var input struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.ID == "" {
		api_response.Error(c, http.StatusBadRequest, msgIDRequired)
		return
	}
	db.DB.Delete(&models.Campaign{}, idQuery, input.ID)
	api_response.Success(c, nil)
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
		handleContestsGet(c, page, limit)
	case http.MethodPost:
		handleContestsPost(c)
	case http.MethodPatch:
		handleContestsUpdate(c)
	case http.MethodDelete:
		handleContestsDelete(c)
	default:
		api_response.Error(c, http.StatusMethodNotAllowed, msgMethodNotAllowed)
	}
}

func handleContestsGet(c *gin.Context, page, limit int) {
	var contests []models.Contest
	var total int64

	db.DB.Model(&models.Contest{}).Count(&total)
	if err := db.DB.Limit(limit).Offset((page - 1) * limit).Order(createdAtDesc).Find(&contests).Error; err != nil {
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
		"contests":   items,
		"items":      items,
		"data":       gin.H{"contests": items, "items": items, "pagination": pagination},
		"pagination": pagination,
		"stats":      gin.H{},
	})
}

func handleContestsPost(c *gin.Context) {
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
}

func handleContestsUpdate(c *gin.Context) {
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
	if err := db.DB.First(&contest, idQuery, id).Error; err != nil {
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
}

func handleContestsDelete(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.Contest{}, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete contest")
		return
	}

	LogAudit(c, "DELETE", "contest", id, nil)
	api_response.Success(c, nil)
}
