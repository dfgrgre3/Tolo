package handlers

import (
	"net/http"
	"strings"
	apiresponse "thanawy-backend/internal/api/response"
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	if strings.HasPrefix(c.FullPath(), "/api/admin/") {
		// Optimize: Batch fetch course counts
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
		return
	}

	c.JSON(http.StatusOK, categories)
}

func GetTeachers(c *gin.Context) {
	var teachers []models.User
	if err := db.DB.Where("role = ?", "TEACHER").Find(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teachers"})
		return
	}

	if strings.HasPrefix(c.FullPath(), "/api/admin/") {
		items := make([]gin.H, 0, len(teachers))
		for _, teacher := range teachers {
			items = append(items, gin.H{
				"id":        teacher.ID,
				"name":      firstNonEmpty(stringOrEmpty(teacher.Name), stringOrEmpty(teacher.Username), teacher.Email),
				"subjectId": "",
				"onlineUrl": nil,
				"rating":    0,
				"notes":     teacher.Bio,
				"createdAt": teacher.CreatedAt,
				"subject": gin.H{
					"name":   "",
					"nameAr": nil,
					"color":  nil,
				},
			})
		}

		apiresponse.Success(c, gin.H{
			"items":    items,
			"teachers": items,
		})
		return
	}

	c.JSON(http.StatusOK, teachers)
}

func CreateCategory(c *gin.Context) {
	var input struct {
		Name        string  `json:"name" binding:"required"`
		Slug        *string `json:"slug"`
		Icon        *string `json:"icon"`
		Description *string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category := models.Category{
		Name:        input.Name,
		Slug:        buildSlug(input.Name, input.Slug),
		Type:        models.CategoryTypeCourse,
		Icon:        input.Icon,
		Description: input.Description,
	}

	if err := db.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"category": category}})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var category models.Category
	if err := db.DB.First(&category, "id = ?", input.ID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	updates := map[string]interface{}{
		"icon":        input.Icon,
		"description": input.Description,
	}
	if input.Name != "" {
		updates["name"] = input.Name
		updates["slug"] = buildSlug(input.Name, input.Slug)
	} else if input.Slug != nil && *input.Slug != "" {
		updates["slug"] = *input.Slug
	}

	if err := db.DB.Model(&category).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteCategory(c *gin.Context) {
	var input struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var count int64
	db.DB.Model(&models.Subject{}).Where("\"categoryId\" = ?", input.ID).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Category is linked to courses"})
		return
	}

	if err := db.DB.Delete(&models.Category{}, "id = ?", input.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func CreateTeacher(c *gin.Context) {
	var input struct {
		Name      string  `json:"name" binding:"required"`
		SubjectID string  `json:"subjectId"`
		OnlineURL *string `json:"onlineUrl"`
		Notes     *string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacherName := input.Name
	email := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(input.Name), " ", ".")) + "@thanawy.local"
	passwordHash := "$2a$12$RYM9CZPUKMeXAHOD01E4QeSjQIvT0.Q.rZEDkHXY/r8ok6sY4M1Ki" // Hash of "temporary-password"
	teacher := models.User{
		Email:        email,
		Name:         &teacherName,
		Username:     &teacherName,
		PasswordHash: passwordHash,
		Role:         models.RoleTeacher,
		Bio:          input.Notes,
	}

	if err := db.DB.Create(&teacher).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create teacher"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"teacher": teacher}})
}

func UpdateTeacher(c *gin.Context) {
	var input struct {
		ID        string  `json:"id" binding:"required"`
		Name      string  `json:"name"`
		OnlineURL *string `json:"onlineUrl"`
		Notes     *string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var teacher models.User
	if err := db.DB.Where("id = ? AND role = ?", input.ID, models.RoleTeacher).First(&teacher).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Teacher not found"})
		return
	}

	updates := map[string]interface{}{
		"bio": input.Notes,
	}
	if input.Name != "" {
		updates["name"] = input.Name
		updates["username"] = input.Name
	}

	if err := db.DB.Model(&teacher).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update teacher"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteTeacher(c *gin.Context) {
	var input struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Delete(&models.User{}, "id = ? AND role = ?", input.ID, models.RoleTeacher).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete teacher"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func buildSlug(name string, explicit *string) string {
	if explicit != nil && strings.TrimSpace(*explicit) != "" {
		return strings.TrimSpace(*explicit)
	}
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = strings.ReplaceAll(slug, " ", "-")
	return slug
}
