package handlers

import (
	"net/http"
	"strings"

	apiresponse "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/cache"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetCategories(c *gin.Context) {
	categoryType := c.Query("type")
	var categories []models.Category

	query := db.DB
	if categoryType != "" {
		query = query.Where("type = ?", categoryType)
	}

	if err := query.Find(&categories).Error; err != nil {
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}

	apiresponse.Success(c, categories)
}

func GetCategoriesForAdmin(c *gin.Context) {
	categoryType := c.Query("type")
	var categories []models.Category

	query := db.DB
	if categoryType != "" {
		query = query.Where("type = ?", categoryType)
	}

	if err := query.Find(&categories).Error; err != nil {
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}

	categoryIDs := make([]string, len(categories))
	for i, cat := range categories {
		categoryIDs[i] = cat.ID
	}

	type countResult struct {
		CategoryID string
		Count      int64
	}
	var counts []countResult
	db.DB.Model(&models.Subject{}).
		Select("\"categoryId\", count(*) as count").
		Where("\"categoryId\" IN ?", categoryIDs).
		Group("\"categoryId\"").
		Scan(&counts)

	countMap := make(map[string]int64)
	for _, c := range counts {
		countMap[c.CategoryID] = c.Count
	}

	items := make([]gin.H, 0, len(categories))
	for _, category := range categories {
		coursesCount := countMap[category.ID]
		items = append(items, gin.H{
			"id":           category.ID,
			"name":         category.Name,
			"slug":         category.Slug,
			"icon":         category.Icon,
			"description":  category.Description,
			"coursesCount": coursesCount,
			"createdAt":    category.CreatedAt,
		})
	}

	apiresponse.Success(c, gin.H{
		"items":      items,
		"categories": items,
	})
}

func CreateCategory(c *gin.Context) {
	var input struct {
		Name        string  `json:"name" binding:"required"`
		Slug        *string `json:"slug"`
		Icon        *string `json:"icon"`
		Description *string `json:"description"`
		Type        *string `json:"type"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		apiresponse.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	categoryType := models.CategoryTypeCourse
	if input.Type != nil && *input.Type != "" {
		categoryType = models.CategoryType(*input.Type)
	}

	slug := buildSlug(input.Name, input.Slug)

	var existing models.Category
	if err := db.DB.Where("slug = ? AND type = ?", slug, categoryType).First(&existing).Error; err == nil {
		apiresponse.Error(c, http.StatusConflict, "Category with this slug and type already exists")
		return
	}

	category := models.Category{
		Name:        input.Name,
		Slug:        slug,
		Type:        categoryType,
		Icon:        input.Icon,
		Description: input.Description,
	}

	if err := SafeCreate(db.DB, &category); err != nil {
		if IsDuplicateKeyError(err) {
			apiresponse.Error(c, http.StatusConflict, "Category with this slug and type already exists")
			return
		}
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to create category")
		return
	}

	cache.NewCacheInvalidator().InvalidateCategory(category.ID)
	apiresponse.Created(c, gin.H{"category": category})
}

func UpdateCategory(c *gin.Context) {
	var input struct {
		ID          string  `json:"id" binding:"required"`
		Name        string  `json:"name"`
		Slug        *string `json:"slug"`
		Icon        *string `json:"icon"`
		Description *string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		apiresponse.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var category models.Category
	if err := db.DB.First(&category, queryID, input.ID).Error; err != nil {
		apiresponse.Error(c, http.StatusNotFound, "Category not found")
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
		updates["slug"] = buildSlug(input.Name, input.Slug)
	} else if input.Slug != nil && *input.Slug != "" {
		updates["slug"] = *input.Slug
	}
	if input.Icon != nil {
		updates["icon"] = *input.Icon
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Category{}).Where(queryID, category.ID).Updates(updates).Error; err != nil {
			apiresponse.Error(c, http.StatusInternalServerError, "Failed to update category")
			return
		}
	}

	cache.NewCacheInvalidator().InvalidateCategory(category.ID)
	apiresponse.Success(c, nil)
}

func DeleteCategory(c *gin.Context) {
	var input struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		apiresponse.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var count int64
	db.DB.Model(&models.Subject{}).Where("\"categoryId\" = ?", input.ID).Count(&count)
	if count > 0 {
		apiresponse.Error(c, http.StatusBadRequest, "Category is linked to courses")
		return
	}

	if err := db.DB.Delete(&models.Category{}, queryID, input.ID).Error; err != nil {
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to delete category")
		return
	}

	cache.NewCacheInvalidator().InvalidateCategory(input.ID)
	apiresponse.Success(c, nil)
}

func buildSlug(name string, explicit *string) string {
	if explicit != nil && strings.TrimSpace(*explicit) != "" {
		return strings.TrimSpace(*explicit)
	}
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = strings.ReplaceAll(slug, " ", "-")
	return slug
}
