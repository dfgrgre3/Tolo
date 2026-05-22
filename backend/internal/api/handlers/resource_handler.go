package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

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

type l1ResourceEntry struct {
	items     []gin.H
	expiresAt time.Time
}

var (
	l1ResourceCache sync.Map
	l1ResourceTTL   = 20 * time.Second
)

func InvalidateResourcesCache() {
	l1ResourceCache.Range(func(key, value interface{}) bool {
		l1ResourceCache.Delete(key)
		return true
	})

	if db.Redis != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			iter := db.Redis.Scan(ctx, 0, "resources:public:*", 100).Iterator()
			for iter.Next(ctx) {
				db.Redis.Del(ctx, iter.Val())
			}
		}()
	}
}

type listResourcesParams struct {
	page         int
	limit        int
	subjectID    string
	resourceType string
	admin        bool
	cacheKey     string
}

func parseListResourcesParams(c *gin.Context, admin bool) listResourcesParams {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	subjectID := c.Query("subjectId")
	resourceType := c.Query("type")

	cacheKey := fmt.Sprintf("resources:public:page:%d:limit:%d:subject:%s:type:%s", page, limit, subjectID, resourceType)

	return listResourcesParams{
		page: page, limit: limit,
		subjectID: subjectID, resourceType: resourceType,
		admin: admin, cacheKey: cacheKey,
	}
}

func listResources(c *gin.Context, admin bool) {
	params := parseListResourcesParams(c, admin)

	if !admin {
		if tryL1ResourcesCache(c, params.cacheKey) {
			return
		}
		if db.Redis != nil {
			if tryRedisResourcesCache(c, params.cacheKey) {
				return
			}
		}
	}

	items, total, err := queryResources(params)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch resources")
		return
	}

	if admin {
		sendAdminResourcesResponse(c, items, total, params)
		return
	}

	sendPublicResourcesResponse(c, items, params)
}

func tryL1ResourcesCache(c *gin.Context, cacheKey string) bool {
	if val, ok := l1ResourceCache.Load(cacheKey); ok {
		entry := val.(*l1ResourceEntry)
		if time.Now().Before(entry.expiresAt) {
			c.JSON(http.StatusOK, entry.items)
			return true
		}
		l1ResourceCache.Delete(cacheKey)
	}
	return false
}

func tryRedisResourcesCache(c *gin.Context, cacheKey string) bool {
	redisCtx, cancel := context.WithTimeout(c.Request.Context(), 200*time.Millisecond)
	cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Result()
	cancel()
	if err != nil {
		return false
	}
	var cachedItems []gin.H
	if json.Unmarshal([]byte(cachedVal), &cachedItems) != nil {
		return false
	}
	l1ResourceCache.Store(cacheKey, &l1ResourceEntry{
		items:     cachedItems,
		expiresAt: time.Now().Add(l1ResourceTTL),
	})
	c.JSON(http.StatusOK, cachedItems)
	return true
}

func queryResources(params listResourcesParams) ([]gin.H, int64, error) {
	query := buildResourceQuery(params)

	var total int64
	if params.admin {
		if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
			return nil, 0, err
		}
	}

	items, err := fetchAndFormatResources(query, params)
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func buildResourceQuery(params listResourcesParams) *gorm.DB {
	readDB := db.ReadDB()
	if readDB == nil {
		readDB = db.DB
	}

	var activeDB *gorm.DB
	if params.admin {
		activeDB = db.DB
	} else {
		activeDB = readDB
	}

	query := activeDB.Model(&models.Resource{}).Preload("Subject")
	if params.subjectID != "" {
		query = query.Where("subject_id = ?", params.subjectID)
	}
	if params.resourceType != "" && params.resourceType != "all" {
		query = query.Where("type = ?", params.resourceType)
	}
	if !params.admin {
		query = query.Where("free = ?", true)
	}
	return query
}

func fetchAndFormatResources(query *gorm.DB, params listResourcesParams) ([]gin.H, error) {
	var resources []models.Resource
	if err := query.Order("created_at DESC").Limit(params.limit).Offset((params.page - 1) * params.limit).Find(&resources).Error; err != nil {
		return nil, err
	}

	items := make([]gin.H, 0, len(resources))
	for _, resource := range resources {
		items = append(items, formatResourceItem(resource, params.admin))
	}
	return items, nil
}

func sendAdminResourcesResponse(c *gin.Context, items []gin.H, total int64, params listResourcesParams) {
	pagination := gin.H{
		"page": params.page, "limit": params.limit, "total": total,
		"totalPages": (total + int64(params.limit) - 1) / int64(params.limit),
	}
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
}

func sendPublicResourcesResponse(c *gin.Context, items []gin.H, params listResourcesParams) {
	if len(items) > 0 {
		l1ResourceCache.Store(params.cacheKey, &l1ResourceEntry{
			items:     items,
			expiresAt: time.Now().Add(l1ResourceTTL),
		})
		if db.Redis != nil {
			go func(key string, data []gin.H) {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()
				if cacheBytes, err := json.Marshal(data); err == nil {
					db.Redis.Set(ctx, key, cacheBytes, 5*time.Minute)
				}
			}(params.cacheKey, items)
		}
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
	InvalidateResourcesCache()
	api_response.Created(c, resource)
}

func AdminUpdateResource(c *gin.Context) {
	var input resourceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	ids := collectResourceIDs(input)
	if len(ids) == 0 {
		api_response.Error(c, http.StatusBadRequest, "id or ids is required")
		return
	}

	updates := buildResourceUpdates(input)
	if !updates.hasUpdates {
		api_response.Error(c, http.StatusBadRequest, "no updates provided")
		return
	}

	if err := db.DB.Model(&models.Resource{}).Where("id IN ?", ids).
		Updates(&updates.structVal).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update resource")
		return
	}
	LogAudit(c, "UPDATE", "resource", input.ID, updates)
	InvalidateResourcesCache()
	api_response.Success(c, gin.H{"updated": len(ids)})
}

func collectResourceIDs(input resourceInput) []string {
	ids := input.IDs
	if input.ID != "" {
		ids = append(ids, input.ID)
	}
	return ids
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

type resourceUpdatesResult struct {
	structVal resourceUpdates
	hasUpdates bool
}

func buildResourceUpdates(input resourceInput) resourceUpdatesResult {
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

	return resourceUpdatesResult{structVal: updates, hasUpdates: hasUpdates}
}

func AdminDeleteResource(c *gin.Context) {
	var input resourceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	ids := collectResourceIDs(input)
	if len(ids) == 0 {
		api_response.Error(c, http.StatusBadRequest, "id or ids is required")
		return
	}
	if err := db.DB.Delete(&models.Resource{}, "id IN ?", ids).Error; err != nil && err != gorm.ErrRecordNotFound {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete resource")
		return
	}
	LogAudit(c, "DELETE", "resource", input.ID, gin.H{"ids": ids})
	InvalidateResourcesCache()
	api_response.Success(c, gin.H{"deleted": len(ids)})
}