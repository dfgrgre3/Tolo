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

	"github.com/gin-gonic/gin"
)

// Generic list helper using api_response.List
func listItems(c *gin.Context, model interface{}, key string, preloads ...string) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 { page = 1 }
	if limit <= 0 { limit = 10 }
	offset := (page - 1) * limit

	var total int64
	db.DB.Model(model).Count(&total)

	query := db.DB.Model(model).Limit(limit).Offset(offset).Order("\"createdAt\" DESC")
	for _, p := range preloads {
		query = query.Preload(p)
	}

	if err := query.Find(model).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch " + key)
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
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Achievement not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteAchievement(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Achievement{}, "id = ?", id)
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
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Reward not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteReward(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Reward{}, "id = ?", id)
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
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Season not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteSeason(c *gin.Context) {
	db.DB.Delete(&models.Season{}, "id = ?", c.Param("id"))
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
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Coupon not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteCoupon(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Coupon{}, "id = ?", id)
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
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Challenge not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteChallenge(c *gin.Context) {
	db.DB.Delete(&models.Challenge{}, "id = ?", c.Param("id"))
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
	if page <= 0 { page = 1 }
	if limit <= 0 { limit = 10 }
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

	if err := query.Preload("User").Limit(limit).Offset(offset).Order("\"createdAt\" DESC").Find(&logs).Error; err != nil {
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
		"logs": logs,
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
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Automation not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteAutomation(c *gin.Context) {
	db.DB.Delete(&models.Automation{}, "id = ?", c.Param("id"))
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
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Blog post not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteBlogPost(c *gin.Context) {
	db.DB.Delete(&models.BlogPost{}, "id = ?", c.Param("id"))
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

// Events
func AdminGetEvents(c *gin.Context) {
	var events []models.Event
	listItems(c, &events, "events", "Subject")
}

func AdminCreateEvent(c *gin.Context) {
	var item models.Event
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	db.DB.Create(&item)
	api_response.Created(c, item)
}

func AdminUpdateEvent(c *gin.Context) {
	id := c.Param("id")
	var item models.Event
	if err := db.DB.First(&item, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Event not found")
		return
	}
	c.ShouldBindJSON(&item)
	db.DB.Save(&item)
	api_response.Success(c, item)
}

func AdminDeleteEvent(c *gin.Context) {
	db.DB.Delete(&models.Event{}, "id = ?", c.Param("id"))
	api_response.Success(c, nil)
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
	
	// Handle multipart form if there are files
	if strings.Contains(c.GetHeader("Content-Type"), "multipart/form-data") {
		book.Title = c.PostForm("title")
		book.Author = c.PostForm("author")
		book.Description = c.PostForm("description")
		book.SubjectID = c.PostForm("subjectId")
		
		price, _ := strconv.ParseFloat(c.PostForm("price"), 64)
		book.Price = price
		book.IsFree = c.PostForm("isFree") == "true"
		
		// Handle cover image
		cover, err := c.FormFile("cover")
		if err == nil {
			ext := strings.ToLower(filepath.Ext(cover.Filename))
			filename := fmt.Sprintf("book_cover_%d%s", time.Now().UnixNano(), ext)
			dst := filepath.Join("uploads", filename)
			if err := c.SaveUploadedFile(cover, dst); err == nil {
				book.CoverUrl = "/uploads/" + filename
			}
		}
		
		// Handle book file
		file, err := c.FormFile("file")
		if err == nil {
			ext := strings.ToLower(filepath.Ext(file.Filename))
			filename := fmt.Sprintf("book_%d%s", time.Now().UnixNano(), ext)
			dst := filepath.Join("uploads", filename)
			if err := c.SaveUploadedFile(file, dst); err == nil {
				book.DownloadUrl = "/uploads/" + filename
			}
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

func AdminUpdateBook(c *gin.Context) {
	id := c.Param("id")
	var book models.Book
	if err := db.DB.First(&book, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Book not found")
		return
	}

	updates := make(map[string]interface{})

	if strings.Contains(c.GetHeader("Content-Type"), "multipart/form-data") {
		updates["title"] = c.PostForm("title")
		updates["author"] = c.PostForm("author")
		updates["description"] = c.PostForm("description")
		updates["subjectId"] = c.PostForm("subjectId")
		
		if priceStr := c.PostForm("price"); priceStr != "" {
			price, _ := strconv.ParseFloat(priceStr, 64)
			updates["price"] = price
		}
		updates["isFree"] = c.PostForm("isFree") == "true"
		
		// Handle cover image
		cover, err := c.FormFile("cover")
		if err == nil {
			ext := strings.ToLower(filepath.Ext(cover.Filename))
			filename := fmt.Sprintf("book_cover_%d%s", time.Now().UnixNano(), ext)
			dst := filepath.Join("uploads", filename)
			if err := c.SaveUploadedFile(cover, dst); err == nil {
				updates["coverUrl"] = "/uploads/" + filename
			}
		}
		
		// Handle book file
		file, err := c.FormFile("file")
		if err == nil {
			ext := strings.ToLower(filepath.Ext(file.Filename))
			filename := fmt.Sprintf("book_%d%s", time.Now().UnixNano(), ext)
			dst := filepath.Join("uploads", filename)
			if err := c.SaveUploadedFile(file, dst); err == nil {
				updates["downloadUrl"] = "/uploads/" + filename
			}
		}
	} else {
		var input map[string]interface{}
		if err := c.ShouldBindJSON(&input); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
		updates = input
	}

	if err := db.DB.Model(&book).Updates(updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update book")
		return
	}

	LogAudit(c, "UPDATE", "book", id, updates)
	api_response.Success(c, book)
}

func AdminDeleteBook(c *gin.Context) {
	id := c.Param("id")
	db.DB.Delete(&models.Book{}, "id = ?", id)
	LogAudit(c, "DELETE", "book", id, nil)
	api_response.Success(c, nil)
}
