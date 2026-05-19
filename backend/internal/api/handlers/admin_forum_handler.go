package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetForum(c *gin.Context) {
	var topics []models.ForumTopic
	if err := db.DB.Preload("Author").Order("created_at DESC").Find(&topics).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch forum topics")
		return
	}
	api_response.Success(c, topics)
}

func AdminGetForumCategories(c *gin.Context) {
	var cats []models.ForumCategory
	if err := db.DB.Order("created_at DESC").Find(&cats).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch forum categories")
		return
	}
	api_response.Success(c, cats)
}

func AdminCreateForumCategory(c *gin.Context) {
	var item models.ForumCategory
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Forum category already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create forum category")
		return
	}

	api_response.Created(c, item)
}
