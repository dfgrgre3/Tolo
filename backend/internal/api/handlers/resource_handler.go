package handlers

import (
	"net/http"
	"strconv"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type resourceInput struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description *string  `json:"description"`
	URL         string   `json:"url"`
	Type        string   `json:"type"`
	Source      *string  `json:"source"`
	Free        *bool    `json:"free"`
	SubjectID   string   `json:"subjectId"`
	IDs         []string `json:"ids"`
}

func listResources(c *gin.Context, admin bool) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	query := db.DB.Model(&models.Resource{}).Preload("Subject")
	if subjectID := c.Query("subjectId"); subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}
	if resourceType := c.Query("type"); resourceType != "" && resourceType != "all" {
		query = query.Where("type = ?", resourceType)
	}
	if !admin {
		query = query.Where("free = ?", true)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to count resources")
		return
	}

	var resources []models.Resource
	if err := query.Order("created_at DESC").Limit(limit).Offset((page - 1) * limit).Find(&resources).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch resources")
		return
	}

	items := make([]gin.H, 0, len(resources))
	for _, resource := range resources {
		items = append(items, formatResourceItem(resource, admin))
	}

	pagination := gin.H{
		"page": page, "limit": limit, "total": total,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	}

	if admin {
		c.JSON(http.StatusOK, gin.H{
			"success":    true,
			"resources":  items,
			"items":      items,
			"data":       gin.H{"resources": items, "items": items, "pagination": pagination},
			"pagination": pagination,
			"stats": gin.H{
				"total": total,
			},
		})
		return
	}

	c.JSON(http.StatusOK, items)
}

func formatResourceItem(resource models.Resource, admin bool) gin.H {
	subjectName := resource.Subject.Name
	if resource.Subject.NameAr != nil && *resource.Subject.NameAr != "" {
		subjectName = *resource.Subject.NameAr
	}

	item := gin.H{
		"id":          resource.ID,
		"title":       resource.Title,
		"description": resource.Description,
		"url":         resource.URL,
		"type":        resource.Type,
		"source":      resource.Source,
		"free":        resource.Free,
		"createdAt":   resource.CreatedAt,
		"subject":     subjectName,
		"subjectId":   resource.SubjectID,
		"subjectName": subjectName,
	}

	if admin {
		item["subject"] = gin.H{
			"id":     resource.Subject.ID,
			"name":   resource.Subject.Name,
			"nameAr": resource.Subject.NameAr,
			"color":  resource.Subject.Color,
		}
	}

	return item
}

func GetResources(c *gin.Context) {
	listResources(c, false)
}

func AdminGetResources(c *gin.Context) {
	listResources(c, true)
}

func AdminCreateResource(c *gin.Context) {
	var input resourceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if input.Title == "" || input.URL == "" || input.SubjectID == "" {
		api_response.Error(c, http.StatusBadRequest, "title, url, and subjectId are required")
		return
	}
	free := true
	if input.Free != nil {
		free = *input.Free
	}
	resourceType := input.Type
	if resourceType == "" {
		resourceType = "link"
	}

	resource := models.Resource{
		Title:       input.Title,
		Description: input.Description,
		URL:         input.URL,
		Type:        resourceType,
		Source:      input.Source,
		Free:        free,
		SubjectID:   input.SubjectID,
	}
	if err := SafeCreate(db.DB, &resource); err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to create resource")
		return
	}
	LogAudit(c, "CREATE", "resource", resource.ID, resource)
	api_response.Created(c, resource)
}

func AdminUpdateResource(c *gin.Context) {
	var input resourceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	ids := input.IDs
	if input.ID != "" {
		ids = append(ids, input.ID)
	}
	if len(ids) == 0 {
		api_response.Error(c, http.StatusBadRequest, "id or ids is required")
		return
	}

	type resourceUpdates struct {
		Title       *string `gorm:"column:title"`
		Description *string `gorm:"column:description"`
		URL         *string `gorm:"column:url"`
		Type        *string `gorm:"column:type"`
		Source      *string `gorm:"column:source"`
		Free        *bool   `gorm:"column:free"`
		SubjectID   *string `gorm:"column:subject_id"`
	}

	updates := resourceUpdates{}
	hasUpdates := false
	if input.Title != "" {
		updates.Title = &input.Title
		hasUpdates = true
	}
	if input.Description != nil {
		updates.Description = input.Description
		hasUpdates = true
	}
	if input.URL != "" {
		updates.URL = &input.URL
		hasUpdates = true
	}
	if input.Type != "" {
		updates.Type = &input.Type
		hasUpdates = true
	}
	if input.Source != nil {
		updates.Source = input.Source
		hasUpdates = true
	}
	if input.Free != nil {
		updates.Free = input.Free
		hasUpdates = true
	}
	if input.SubjectID != "" {
		updates.SubjectID = &input.SubjectID
		hasUpdates = true
	}

	if !hasUpdates {
		api_response.Error(c, http.StatusBadRequest, "no updates provided")
		return
	}

	if err := db.DB.Model(&models.Resource{}).Where("id IN ?", ids).
		Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update resource")
		return
	}
	LogAudit(c, "UPDATE", "resource", input.ID, updates)
	api_response.Success(c, gin.H{"updated": len(ids)})
}

func AdminDeleteResource(c *gin.Context) {
	var input resourceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	ids := input.IDs
	if input.ID != "" {
		ids = append(ids, input.ID)
	}
	if len(ids) == 0 {
		api_response.Error(c, http.StatusBadRequest, "id or ids is required")
		return
	}
	if err := db.DB.Delete(&models.Resource{}, "id IN ?", ids).Error; err != nil && err != gorm.ErrRecordNotFound {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete resource")
		return
	}
	LogAudit(c, "DELETE", "resource", input.ID, gin.H{"ids": ids})
	api_response.Success(c, gin.H{"deleted": len(ids)})
}
