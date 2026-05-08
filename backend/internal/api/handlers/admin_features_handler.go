package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/storage"

	"github.com/gin-gonic/gin"
)

const headerContentType = "Content-Type"

// Generic list helper using api_response.List
func listItems(c *gin.Context, model interface{}, key string, preloads ...string) {
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
	db.DB.Model(model).Count(&total)

	query := db.DB.Model(model).Limit(limit).Offset(offset).Order("created_at DESC")
	for _, p := range preloads {
		query = query.Preload(p)
	}

	if err := query.Find(model).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch "+key)
		return
	}

	pagination := api_response.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: (total + int64(limit) - 1) / int64(limit),
	}

	api_response.List(c, model, pagination, gin.H{key: model})
}

// Achievements
func AdminGetAchievements(c *gin.Context) {
	var achievements []models.Achievement
	listItems(c, &achievements, "achievements")
}

func AdminCreateAchievement(c *gin.Context) {
	var achievement models.Achievement
	if err := c.ShouldBindJSON(&achievement); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&achievement)
	LogAudit(c, "CREATE", "achievement", achievement.ID, achievement)
	api_response.Created(c, achievement)
}

func AdminUpdateAchievement(c *gin.Context) {
	id := c.Param("id")
	var achievement models.Achievement
	if err := db.DB.Where(queryID, id).First(&achievement).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Achievement not found")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Icon        *string `json:"icon"`
		Points      *int    `json:"points"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type achievementUpdates struct {
		Name        *string `gorm:"column:name"`
		Description *string `gorm:"column:description"`
		Icon        *string `gorm:"column:icon"`
		Points      *int    `gorm:"column:points"`
	}

	updates := achievementUpdates{
		Name:        input.Name,
		Description: input.Description,
		Icon:        input.Icon,
		Points:      input.Points,
	}

	if err := db.DB.Model(&models.Achievement{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update achievement")
		return
	}

	LogAudit(c, "UPDATE", "achievement", id, updates)
	api_response.Success(c, achievement)
}

func AdminDeleteAchievement(c *gin.Context) {
	id := c.Param("id")
	db.DB.Where(queryID, id).Delete(&models.Achievement{})
	LogAudit(c, "DELETE", "achievement", id, nil)
	api_response.Success(c, nil)
}

// Rewards
func AdminGetRewards(c *gin.Context) {
	var rewards []models.Reward
	listItems(c, &rewards, "rewards")
}

func AdminCreateReward(c *gin.Context) {
	var reward models.Reward
	if err := c.ShouldBindJSON(&reward); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&reward)
	LogAudit(c, "CREATE", "reward", reward.ID, reward)
	api_response.Created(c, reward)
}

func AdminUpdateReward(c *gin.Context) {
	id := c.Param("id")
	var reward models.Reward
	if err := db.DB.Where(queryID, id).First(&reward).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Reward not found")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Cost        *int    `json:"cost"`
		Type        *string `json:"type"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type rewardUpdates struct {
		Name        *string `gorm:"column:name"`
		Description *string `gorm:"column:description"`
		Cost        *int    `gorm:"column:cost"`
		Type        *string `gorm:"column:type"`
	}

	updates := rewardUpdates{
		Name:        input.Name,
		Description: input.Description,
		Cost:        input.Cost,
		Type:        input.Type,
	}

	if err := db.DB.Model(&models.Reward{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update reward")
		return
	}

	LogAudit(c, "UPDATE", "reward", id, updates)
	api_response.Success(c, reward)
}

func AdminDeleteReward(c *gin.Context) {
	id := c.Param("id")
	db.DB.Where(queryID, id).Delete(&models.Reward{})
	LogAudit(c, "DELETE", "reward", id, nil)
	api_response.Success(c, nil)
}

// Seasons
func AdminGetSeasons(c *gin.Context) {
	var seasons []models.Season
	listItems(c, &seasons, "seasons")
}

func AdminCreateSeason(c *gin.Context) {
	var item models.Season
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

func AdminUpdateSeason(c *gin.Context) {
	id := c.Param("id")
	var season models.Season
	if err := db.DB.Where(queryID, id).First(&season).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Season not found")
		return
	}

	var input struct {
		Name      *string    `json:"name"`
		StartDate *time.Time `json:"startDate"`
		EndDate   *time.Time `json:"endDate"`
		IsActive  *bool      `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type seasonUpdates struct {
		Name      *string    `gorm:"column:name"`
		StartDate *time.Time `gorm:"column:start_date"`
		EndDate   *time.Time `gorm:"column:end_date"`
		IsActive  *bool      `gorm:"column:is_active"`
	}

	updates := seasonUpdates{
		Name:      input.Name,
		StartDate: input.StartDate,
		EndDate:   input.EndDate,
		IsActive:  input.IsActive,
	}

	if err := db.DB.Model(&models.Season{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update season")
		return
	}

	api_response.Success(c, season)
}

func AdminDeleteSeason(c *gin.Context) {
	db.DB.Where(queryID, c.Param("id")).Delete(&models.Season{})
	api_response.Success(c, nil)
}

// Coupons
func AdminGetCoupons(c *gin.Context) {
	var coupons []models.Coupon
	listItems(c, &coupons, "coupons")
}

func AdminCreateCoupon(c *gin.Context) {
	var item models.Coupon
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

func AdminUpdateCoupon(c *gin.Context) {
	id := c.Param("id")
	var coupon models.Coupon
	if err := db.DB.Where(queryID, id).First(&coupon).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Coupon not found")
		return
	}

	var input struct {
		Code           *string    `json:"code"`
		DiscountType   *string    `json:"discountType"`
		DiscountValue  *float64   `json:"discountValue"`
		ExpirationDate *time.Time `json:"expirationDate"`
		MaxUses        *int       `json:"maxUses"`
		IsActive       *bool      `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type couponUpdates struct {
		Code           *string    `gorm:"column:code"`
		DiscountType   *string    `gorm:"column:discount_type"`
		DiscountValue  *float64   `gorm:"column:discount_value"`
		ExpirationDate *time.Time `gorm:"column:expiration_date"`
		MaxUses        *int       `gorm:"column:max_uses"`
		IsActive       *bool      `gorm:"column:is_active"`
	}

	updates := couponUpdates{
		Code:           input.Code,
		DiscountType:   input.DiscountType,
		DiscountValue:  input.DiscountValue,
		ExpirationDate: input.ExpirationDate,
		MaxUses:        input.MaxUses,
		IsActive:       input.IsActive,
	}

	if err := db.DB.Model(&models.Coupon{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update coupon")
		return
	}

	LogAudit(c, "UPDATE", "coupon", id, updates)
	api_response.Success(c, coupon)
}

func AdminDeleteCoupon(c *gin.Context) {
	id := c.Param("id")
	db.DB.Where(queryID, id).Delete(&models.Coupon{})
	LogAudit(c, "DELETE", "coupon", id, nil)
	api_response.Success(c, nil)
}

// Challenges
func AdminGetChallenges(c *gin.Context) {
	var challenges []models.Challenge
	listItems(c, &challenges, "challenges", "Subject")
}

func AdminCreateChallenge(c *gin.Context) {
	var item models.Challenge
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

func AdminUpdateChallenge(c *gin.Context) {
	id := c.Param("id")
	var challenge models.Challenge
	if err := db.DB.Where(queryID, id).First(&challenge).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Challenge not found")
		return
	}

	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Points      *int    `json:"points"`
		IsActive    *bool   `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type challengeUpdates struct {
		Title       *string `gorm:"column:title"`
		Description *string `gorm:"column:description"`
		Points      *int    `gorm:"column:points"`
		IsActive    *bool   `gorm:"column:is_active"`
	}

	updates := challengeUpdates{
		Title:       input.Title,
		Description: input.Description,
		Points:      input.Points,
		IsActive:    input.IsActive,
	}

	if err := db.DB.Model(&models.Challenge{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update challenge")
		return
	}

	api_response.Success(c, challenge)
}

func AdminDeleteChallenge(c *gin.Context) {
	db.DB.Where(queryID, c.Param("id")).Delete(&models.Challenge{})
	api_response.Success(c, nil)
}

// Audit Logs
func AdminGetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog

	// Handle eventTypes list for filter
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

// Automations
func AdminGetAutomations(c *gin.Context) {
	var automations []models.Automation
	listItems(c, &automations, "rules")
}

func AdminCreateAutomation(c *gin.Context) {
	var item models.Automation
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

func AdminUpdateAutomation(c *gin.Context) {
	id := c.Param("id")
	var automation models.Automation
	if err := db.DB.Where(queryID, id).First(&automation).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Automation not found")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Type        *string `json:"type"`
		Trigger     *string `json:"trigger"`
		Action      *string `json:"action"`
		Condition   *string `json:"condition"`
		IsActive    *bool   `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type automationUpdates struct {
		Name        *string `gorm:"column:name"`
		Type        *string `gorm:"column:type"`
		Trigger     *string `gorm:"column:trigger"`
		Action      *string `gorm:"column:action"`
		Condition   *string `gorm:"column:condition"`
		IsActive    *bool   `gorm:"column:is_active"`
	}

	updates := automationUpdates{
		Name:      input.Name,
		Type:      input.Type,
		Trigger:   input.Trigger,
		Action:    input.Action,
		Condition: input.Condition,
		IsActive:  input.IsActive,
	}

	if err := db.DB.Model(&models.Automation{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update automation")
		return
	}

	api_response.Success(c, automation)
}

func AdminDeleteAutomation(c *gin.Context) {
	db.DB.Where(queryID, c.Param("id")).Delete(&models.Automation{})
	api_response.Success(c, nil)
}

// Blog
func AdminGetBlog(c *gin.Context) {
	var posts []models.BlogPost
	listItems(c, &posts, "posts", "Author")
}

func AdminCreateBlogPost(c *gin.Context) {
	var item models.BlogPost
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

func AdminUpdateBlogPost(c *gin.Context) {
	id := c.Param("id")
	var post models.BlogPost
	if err := db.DB.Where(queryID, id).First(&post).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Blog post not found")
		return
	}

	var input struct {
		Title       *string `json:"title"`
		Content     *string `json:"content"`
		Slug        *string `json:"slug"`
		Status      *string `json:"status"`
		CategoryID  *string `json:"categoryId"`
		FeaturedImg *string `json:"featuredImage"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type blogUpdates struct {
		Title       *string `gorm:"column:title"`
		Content     *string `gorm:"column:content"`
		Slug        *string `gorm:"column:slug"`
		Status      *string `gorm:"column:status"`
		CategoryID  *string `gorm:"column:category_id"`
		FeaturedImg *string `gorm:"column:featured_image"`
	}

	updates := blogUpdates{
		Title:       input.Title,
		Content:     input.Content,
		Slug:        input.Slug,
		Status:      input.Status,
		CategoryID:  input.CategoryID,
		FeaturedImg: input.FeaturedImg,
	}

	if err := db.DB.Model(&models.BlogPost{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update blog post")
		return
	}

	api_response.Success(c, post)
}

func AdminDeleteBlogPost(c *gin.Context) {
	db.DB.Where(queryID, c.Param("id")).Delete(&models.BlogPost{})
	api_response.Success(c, nil)
}

// Forum
func AdminGetForum(c *gin.Context) {
	var topics []models.ForumTopic
	listItems(c, &topics, "topics", "Author")
}

func AdminGetForumCategories(c *gin.Context) {
	var cats []models.ForumCategory
	listItems(c, &cats, "categories")
}

func AdminCreateForumCategory(c *gin.Context) {
	var item models.ForumCategory
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

// AB Testing
func AdminGetABTests(c *gin.Context) {
	var tests []models.ABExperiment
	listItems(c, &tests, "experiments")
}

// Books
func AdminGetBooks(c *gin.Context) {
	var books []models.Book
	listItems(c, &books, "books", "Subject")
}

func AdminCreateBook(c *gin.Context) {
	var book models.Book

	if strings.Contains(c.GetHeader(headerContentType), "multipart/form-data") {
		book = parseBookFromForm(c)
		if url, err := uploadMultipartFile(c, "cover", "book_cover"); err == nil {
			book.CoverUrl = url
		}
		if url, err := uploadMultipartFile(c, "file", "book"); err == nil {
			book.DownloadUrl = url
		}
	} else {
		if err := c.ShouldBindJSON(&book); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
	}

	if book.Title == "" {
		api_response.Error(c, http.StatusBadRequest, "Book title is required")
		return
	}

	if err := db.DB.Create(&book).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to create book record")
		return
	}

	LogAudit(c, "CREATE", "book", book.ID, book)
	api_response.Created(c, book)
}

func parseBookFromForm(c *gin.Context) models.Book {
	var book models.Book
	book.Title = c.PostForm("title")
	book.Author = c.PostForm("author")
	book.Description = c.PostForm("description")
	subjectId := c.PostForm("subjectId")
	if subjectId != "" {
		book.SubjectID = &subjectId
	}
	price, _ := strconv.ParseFloat(c.PostForm("price"), 64)
	book.Price = price
	book.IsFree = c.PostForm("isFree") == "true"
	return book
}

func uploadMultipartFile(c *gin.Context, fieldName, prefix string) (string, error) {
	header, err := c.FormFile(fieldName)
	if err != nil {
		return "", err
	}

	f, err := header.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	filename := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), ext)

	return storage.GlobalStorage.Upload(c.Request.Context(), filename, f, header.Size, header.Header.Get(headerContentType))
}

func AdminUpdateBook(c *gin.Context) {
	id := c.Param("id")
	var book models.Book
	if err := db.DB.Where(queryID, id).First(&book).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Book not found")
		return
	}

	// Use a dedicated struct for updates to ensure type safety and avoid SQL injection flags
	// associated with dynamic maps.
	var input struct {
		Title       *string                 `json:"title" form:"title"`
		Author      *string                 `json:"author" form:"author"`
		Description *string                 `json:"description" form:"description"`
		SubjectID   *string                 `json:"subjectId" form:"subjectId"`
		Price       *float64                `json:"price" form:"price"`
		IsFree      *bool                   `json:"isFree" form:"isFree"`
		Tags        *models.JSONStringArray `json:"tags" form:"tags"`
	}

	if err := c.ShouldBind(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	// We use another struct that matches GORM's column naming conventions
	type bookUpdates struct {
		Title       *string                 `gorm:"column:title"`
		Author      *string                 `gorm:"column:author"`
		Description *string                 `gorm:"column:description"`
		SubjectID   *string                 `gorm:"column:subject_id"`
		Price       *float64                `gorm:"column:price"`
		IsFree      *bool                   `gorm:"column:is_free"`
		Tags        *models.JSONStringArray `gorm:"column:tags"`
		CoverUrl    *string                 `gorm:"column:cover_url"`
		DownloadUrl *string                 `gorm:"column:download_url"`
	}

	updates := bookUpdates{
		Title:       input.Title,
		Author:      input.Author,
		Description: input.Description,
		SubjectID:   input.SubjectID,
		Price:       input.Price,
		IsFree:      input.IsFree,
		Tags:        input.Tags,
	}

	// Handle file uploads
	if url, err := uploadMultipartFile(c, "cover", "book_cover"); err == nil {
		updates.CoverUrl = &url
	}
	if url, err := uploadMultipartFile(c, "file", "book"); err == nil {
		updates.DownloadUrl = &url
	}

	// Perform the update using the struct. GORM will only update non-nil fields.
	if err := db.DB.Model(&models.Book{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update book")
		return
	}

	LogAudit(c, "UPDATE", "book", id, updates)
	api_response.Success(c, book)
}



func AdminDeleteBook(c *gin.Context) {
	id := c.Param("id")
	db.DB.Where(queryID, id).Delete(&models.Book{})
	LogAudit(c, "DELETE", "book", id, nil)
	api_response.Success(c, nil)
}

// AB Testing CRUD
func AdminCreateABTest(c *gin.Context) {
	var item models.ABExperiment
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

func AdminUpdateABTest(c *gin.Context) {
	id := c.Param("id")
	var experiment models.ABExperiment
	if err := db.DB.Where(queryID, id).First(&experiment).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "AB Test not found")
		return
	}

	var input struct {
		Name         *string  `json:"name"`
		Description  *string  `json:"description"`
		Status       *string  `json:"status"`
		TrafficSplit *float64 `json:"trafficSplit"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type experimentUpdates struct {
		Name         *string  `gorm:"column:name"`
		Description  *string  `gorm:"column:description"`
		Status       *string  `gorm:"column:status"`
		TrafficSplit *float64 `gorm:"column:traffic_split"`
	}

	updates := experimentUpdates{
		Name:         input.Name,
		Description:  input.Description,
		Status:       input.Status,
		TrafficSplit: input.TrafficSplit,
	}

	if err := db.DB.Model(&models.ABExperiment{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update AB Test")
		return
	}

	api_response.Success(c, experiment)
}

func AdminDeleteABTest(c *gin.Context) {
	db.DB.Where(queryID, c.Param("id")).Delete(&models.ABExperiment{})
	api_response.Success(c, nil)
}

// Campaign CRUD
func AdminGetCampaigns(c *gin.Context) {
	var campaigns []models.Campaign
	listItems(c, &campaigns, "campaigns")
}

func AdminCreateCampaign(c *gin.Context) {
	var item models.Campaign
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if item.Name == "" {
		api_response.Error(c, http.StatusBadRequest, "Campaign name is required")
		return
	}
	if err := db.DB.Create(&item).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to create campaign")
		return
	}
	api_response.Created(c, item)
}

func AdminUpdateCampaign(c *gin.Context) {
	id := c.Param("id")
	var campaign models.Campaign
	if err := db.DB.Where(queryID, id).First(&campaign).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Campaign not found")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	type campaignUpdates struct {
		Name        *string `gorm:"column:name"`
		Description *string `gorm:"column:description"`
		Status      *string `gorm:"column:status"`
	}

	updates := campaignUpdates{
		Name:        input.Name,
		Description: input.Description,
		Status:      input.Status,
	}

	if err := db.DB.Model(&models.Campaign{}).Where(queryID, id).Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update campaign")
		return
	}

	api_response.Success(c, campaign)
}

func AdminDeleteCampaign(c *gin.Context) {
	db.DB.Where(queryID, c.Param("id")).Delete(&models.Campaign{})
	api_response.Success(c, nil)
}

// Public Blog Endpoints
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
			"page": page, "limit": limit, "total": total,
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
	// Increment views
	db.DB.Model(&post).UpdateColumn("views", post.Views+1)
	api_response.Success(c, post)
}

// Public Events Endpoint
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
	query := db.DB.Model(&models.Event{}).Where("is_active = ?", true)
	query.Count(&total)
	query.Order("start_date ASC").Limit(limit).Offset((page - 1) * limit).Find(&events)

	api_response.Success(c, gin.H{
		"events": events,
		"pagination": gin.H{
			"page": page, "limit": limit, "total": total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
