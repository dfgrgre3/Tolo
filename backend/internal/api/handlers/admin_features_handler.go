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
	var item models.Achievement
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Achievement not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteAchievement(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Achievement{}, idQuery, id)
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
	var item models.Reward
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Reward not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteReward(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Reward{}, idQuery, id)
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
	var item models.Season
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Season not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteSeason(c *gin.Context) {
	db.DB.Delete(&models.Season{}, idQuery, c.Param("id"))
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
	var item models.Coupon
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Coupon not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteCoupon(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Coupon{}, idQuery, id)
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
	var item models.Challenge
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Challenge not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteChallenge(c *gin.Context) {
	db.DB.Delete(&models.Challenge{}, idQuery, c.Param("id"))
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
	var item models.Automation
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Automation not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteAutomation(c *gin.Context) {
	db.DB.Delete(&models.Automation{}, idQuery, c.Param("id"))
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
	var item models.BlogPost
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Blog post not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteBlogPost(c *gin.Context) {
	db.DB.Delete(&models.BlogPost{}, idQuery, c.Param("id"))
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
	if err := db.DB.First(&book, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Book not found")
		return
	}

	updates := make(map[string]interface{})

	if strings.Contains(c.GetHeader(headerContentType), "multipart/form-data") {
		mapUpdateFromForm(c, updates)
		if url, err := uploadMultipartFile(c, "cover", "book_cover"); err == nil {
			updates["cover_url"] = url
		}
		if url, err := uploadMultipartFile(c, "file", "book"); err == nil {
			updates["download_url"] = url
		}
	} else {
		applyUpdateFromJSON(c, updates)
	}

	// Ensure we only update the specific record and only with allowed fields
	if err := db.DB.Model(&book).Updates(updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update book")
		return
	}

	LogAudit(c, "UPDATE", "book", id, updates)
	api_response.Success(c, book)
}

func mapUpdateFromForm(c *gin.Context, updates map[string]interface{}) {
	if val := c.PostForm("title"); val != "" {
		updates["title"] = val
	}
	if val := c.PostForm("author"); val != "" {
		updates["author"] = val
	}
	if val := c.PostForm("description"); val != "" {
		updates["description"] = val
	}
	if val := c.PostForm("subjectId"); val != "" {
		updates["subject_id"] = val
	}

	if priceStr := c.PostForm("price"); priceStr != "" {
		if price, err := strconv.ParseFloat(priceStr, 64); err == nil {
			updates["price"] = price
		}
	}
	if isFreeStr := c.PostForm("isFree"); isFreeStr != "" {
		updates["is_free"] = isFreeStr == "true"
	}
}

func applyUpdateFromJSON(c *gin.Context, updates map[string]interface{}) {
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err == nil {
		// Map JSON keys to database column names
		fieldMapping := map[string]string{
			"title":       "title",
			"author":      "author",
			"description": "description",
			"subjectId":   "subject_id",
			"price":       "price",
			"isFree":      "is_free",
			"tags":        "tags",
		}
		for jsonKey, dbCol := range fieldMapping {
			if val, ok := input[jsonKey]; ok {
				updates[dbCol] = val
			}
		}
	}
}

func AdminDeleteBook(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Book{}, idQuery, id)
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
	var item models.ABExperiment
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "AB Test not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteABTest(c *gin.Context) {
	db.DB.Delete(&models.ABExperiment{}, idQuery, c.Param("id"))
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
	var item models.Campaign
	if err := db.DB.First(&item, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Campaign not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteCampaign(c *gin.Context) {
	db.DB.Delete(&models.Campaign{}, idQuery, c.Param("id"))
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
