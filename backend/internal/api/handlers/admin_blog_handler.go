package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetBlog(c *gin.Context) {
	var posts []models.BlogPost
	if err := db.DB.Preload("Author").Order("created_at DESC").Find(&posts).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch blog posts")
		return
	}
	api_response.Success(c, posts)
}

func AdminCreateBlogPost(c *gin.Context) {
	var item models.BlogPost
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Blog post with this slug already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create blog post")
		return
	}

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

	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Content != nil {
		updates["content"] = *input.Content
	}
	if input.Slug != nil {
		updates["slug"] = *input.Slug
	}
	if input.Status != nil {
		updates["status"] = *input.Status
	}
	if input.CategoryID != nil {
		updates["category_id"] = *input.CategoryID
	}
	if input.FeaturedImg != nil {
		updates["featured_image"] = *input.FeaturedImg
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.BlogPost{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update blog post")
			return
		}
	}

	api_response.Success(c, post)
}

func AdminDeleteBlogPost(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.BlogPost{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete blog post")
		return
	}
	api_response.Success(c, nil)
}
