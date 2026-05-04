package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/api/pagination"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

// SearchUsers performs full-text search on users with cursor pagination
// @Summary Search users with advanced filtering
// @Description Search users by name, email, or other fields with cursor pagination
// @Tags admin,search
// @Accept json
// @Produce json
// @Param q query string false "Search query"
// @Param fields query string false "Fields to search (comma-separated: name,email,username)"
// @Param cursor query string false "Pagination cursor"
// @Param limit query int false "Items per page (max 100)"
// @Param filter_role query string false "Filter by role"
// @Param filter_status query string false "Filter by status"
// @Param sort query string false "Sort field (default: created_at)"
// @Param order query string false "Sort order (asc|desc, default: desc)"
// @Success 200 {object} pagination.PaginatedResponse
// @Router /api/admin/search/users [get]
func SearchUsers(c *gin.Context) {
	// Parse search parameters
	params := pagination.ParseSearchFromRequest(c)

	// Base query
	query := db.DB.Model(&models.User{})

	// Apply full-text search
	if params.Query != "" && len(params.Fields) > 0 {
		// Default search fields if not specified
		if len(params.Fields) == 0 {
			params.Fields = []string{"name", "email", "username"}
		}
		query = params.ApplyFullTextSearch(query, "users")
	}

	// Apply filters
	query = params.ApplyFilters(query, "users")

	// Count total
	var totalCount int64
	query.Count(&totalCount)

	// Apply cursor pagination
	paginatedQuery, err := params.Pagination.ApplyCursor(query)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch results
	var users []models.User
	if err := paginatedQuery.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Convert to response format
	data := make([]interface{}, len(users))
	for i, u := range users {
		data[i] = map[string]interface{}{
			"id":         u.ID,
			"name":       u.Name,
			"email":      u.Email,
			"username":   u.Username,
			"role":       u.Role,
			"created_at": u.CreatedAt,
			"status":     u.Status,
		}
	}

	// Build response
	response := params.Pagination.BuildResponse(data, totalCount)
	pagination.WritePaginatedResponse(c, response)
}

// SearchContent performs full-text search on content (subjects, courses, exams)
// @Summary Search educational content
// @Description Search subjects, courses, and exams with filtering and pagination
// @Tags admin,search
// @Accept json
// @Produce json
// @Param q query string false "Search query"
// @Param type query string false "Content type (subject,course,exam,all)"
// @Param cursor query string false "Pagination cursor"
// @Param limit query int false "Items per page (max 100)"
// @Param filter_subject query string false "Filter by subject ID"
// @Param filter_grade query string false "Filter by grade level"
// @Param sort query string false "Sort field"
// @Param order query string false "Sort order (asc|desc)"
// @Success 200 {object} pagination.PaginatedResponse
// @Router /api/admin/search/content [get]
func SearchContent(c *gin.Context) {
	// Parse search parameters
	params := pagination.ParseSearchFromRequest(c)
	contentType := c.Query("type")
	if contentType == "" {
		contentType = "all"
	}

	var results []interface{}
	var totalCount int64

	switch contentType {
	case "subject", "subjects":
		results, totalCount = searchSubjects(params)
	case "course", "courses":
		results, totalCount = searchCourses(params)
	case "exam", "exams":
		results, totalCount = searchExams(params)
	default:
		// Search all content types
		subjects, subjectCount := searchSubjects(params)
		results = append(results, subjects...)
		totalCount += subjectCount
	}

	// Build response
	response := params.Pagination.BuildResponse(results, totalCount)
	pagination.WritePaginatedResponse(c, response)
}

// searchSubjects searches subjects with filters
func searchSubjects(params pagination.SearchParams) ([]interface{}, int64) {
	query := db.DB.Model(&models.Subject{})

	if params.Query != "" {
		params.Fields = []string{"name", "description"}
		query = params.ApplyFullTextSearch(query, "subjects")
	}

	query = params.ApplyFilters(query, "subjects")

	var total int64
	query.Count(&total)

	paginatedQuery, _ := params.Pagination.ApplyCursor(query)

	var subjects []models.Subject
	paginatedQuery.Find(&subjects)

	results := make([]interface{}, len(subjects))
	for i, s := range subjects {
		results[i] = map[string]interface{}{
			"id":          s.ID,
			"name":        s.Name,
			"description": s.Description,
			"type":        "subject",
			"created_at":  s.CreatedAt,
		}
	}

	return results, total
}

// searchCourses searches courses with filters
func searchCourses(params pagination.SearchParams) ([]interface{}, int64) {
	// Note: Adjust model name based on your actual model
	query := db.DB.Table("courses")

	if params.Query != "" {
		params.Fields = []string{"title", "description"}
		query = params.ApplyFullTextSearch(query, "courses")
	}

	query = params.ApplyFilters(query, "courses")

	var total int64
	query.Count(&total)

	paginatedQuery, _ := params.Pagination.ApplyCursor(query)

	var courses []map[string]interface{}
	paginatedQuery.Find(&courses)

	results := make([]interface{}, len(courses))
	for i, c := range courses {
		c["type"] = "course"
		results[i] = c
	}

	return results, total
}

// searchExams searches exams with filters
func searchExams(params pagination.SearchParams) ([]interface{}, int64) {
	query := db.DB.Model(&models.Exam{})

	if params.Query != "" {
		params.Fields = []string{"title", "description"}
		query = params.ApplyFullTextSearch(query, "exams")
	}

	query = params.ApplyFilters(query, "exams")

	var total int64
	query.Count(&total)

	paginatedQuery, _ := params.Pagination.ApplyCursor(query)

	var exams []models.Exam
	paginatedQuery.Find(&exams)

	results := make([]interface{}, len(exams))
	for i, e := range exams {
		results[i] = map[string]interface{}{
			"id":         e.ID,
			"title":      e.Title,
			"subject_id": e.SubjectID,
			"type":       "exam",
			"created_at": e.CreatedAt,
		}
	}

	return results, total
}
