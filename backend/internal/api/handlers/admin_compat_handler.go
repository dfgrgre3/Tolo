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
)

const createdAtDesc = "created_at DESC"
const msgMethodNotAllowed = "Method not allowed"
const msgIDRequired = "ID is required"
const queryStatus = "status = ?"

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
			query = query.Where(queryStatus, status)
		}
		query.Count(&total)
		db.DB.Model(&models.ContentReport{}).Where(queryStatus, "PENDING").Count(&pending)
		db.DB.Model(&models.ContentReport{}).Where(queryStatus, "RESOLVED").Count(&resolved)

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
		type reportUpdates struct {
			Status     *string    `gorm:"column:status"`
			ResolvedAt *time.Time `gorm:"column:resolved_at"`
			ResolvedBy *string    `gorm:"column:resolved_by"`
		}
		updates := reportUpdates{
			Status: &input.Status,
		}
		if input.Status == "RESOLVED" || input.Status == "DISMISSED" {
			now := time.Now()
			updates.ResolvedAt = &now
			if userId, exists := c.Get("userId"); exists {
				uid := userId.(string)
				updates.ResolvedBy = &uid
			}
		}
		db.DB.Model(&models.ContentReport{}).Where(queryID, input.ID).
			Updates(&updates)
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
		db.DB.Where(queryID, input.ID).Delete(&models.CourseReview{})
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
	if err := SafeCreate(db.DB, &item); err != nil {
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
	if err := db.DB.Where(queryID, id).First(&item).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Campaign not found")
		return
	}

	type campaignUpdates struct {
		Name        *string `gorm:"column:name"`
		Description *string `gorm:"column:description"`
		Type        *string `gorm:"column:type"`
		Status      *string `gorm:"column:status"`
		TargetRole  *string `gorm:"column:target_role"`
		Content     *string `gorm:"column:content"`
		StartDate   *string `gorm:"column:start_date"`
		EndDate     *string `gorm:"column:end_date"`
	}

	var updates campaignUpdates
	if v, ok := input["name"].(string); ok {
		updates.Name = &v
	}
	if v, ok := input["description"].(string); ok {
		updates.Description = &v
	}
	if v, ok := input["type"].(string); ok {
		updates.Type = &v
	}
	if v, ok := input["status"].(string); ok {
		updates.Status = &v
	}
	if v, ok := input["targetRole"].(string); ok {
		updates.TargetRole = &v
	}
	if v, ok := input["content"].(string); ok {
		updates.Content = &v
	}
	if v, ok := input["startDate"].(string); ok {
		updates.StartDate = &v
	}
	if v, ok := input["endDate"].(string); ok {
		updates.EndDate = &v
	}

	db.DB.Model(&models.Campaign{}).Where(queryID, id).
		Updates(&updates)
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
	db.DB.Where(queryID, input.ID).Delete(&models.Campaign{})
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

	if err := SafeCreate(db.DB, &contest); err != nil {
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
	if err := db.DB.Where(queryID, id).First(&contest).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Contest not found")
		return
	}

	type contestUpdates struct {
		Title       *string `gorm:"column:title"`
		Description *string `gorm:"column:description"`
		Category    *string `gorm:"column:category"`
		Status      *string `gorm:"column:status"`
		PinCode     *string `gorm:"column:pin_code"`
	}

	updates := contestUpdates{
		Title:       input.Title,
		Description: input.Description,
		Category:    input.Category,
		Status:      input.Status,
		PinCode:     input.PinCode,
	}

	if err := db.DB.Model(&models.Contest{}).Where(queryID, id).
		Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update contest")
		return
	}

	LogAudit(c, "UPDATE", "contest", id, updates)
	api_response.Success(c, nil)
}

func handleContestsDelete(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Contest{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete contest")
		return
	}

	LogAudit(c, "DELETE", "contest", id, nil)
	api_response.Success(c, nil)
}
