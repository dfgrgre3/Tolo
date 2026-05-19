package http

import (
	"net/http"
	"strconv"

	"thanawy-backend/internal/domain/subject"

	"github.com/gin-gonic/gin"
)

type SubjectHandler struct {
	service *subject.Service
}

func NewSubjectHandler(service *subject.Service) *SubjectHandler {
	return &SubjectHandler{service: service}
}

func (h *SubjectHandler) CreateSubject(c *gin.Context) {
	var input subject.CreateSubjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	s, err := h.service.CreateSubject(c.Request.Context(), input)
	if err != nil {
		switch err {
		case subject.ErrInvalidInput:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case subject.ErrSubjectExists:
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subject"})
		}
		return
	}

	c.JSON(http.StatusCreated, s)
}

func (h *SubjectHandler) GetSubject(c *gin.Context) {
	idOrSlug := c.Param("id")

	s, err := h.service.GetSubject(c.Request.Context(), idOrSlug)
	if err != nil {
		if err == subject.ErrSubjectNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subject"})
		return
	}

	c.JSON(http.StatusOK, s)
}

func (h *SubjectHandler) UpdateSubject(c *gin.Context) {
	id := c.Param("id")

	var input subject.UpdateSubjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.ID = id

	s, err := h.service.UpdateSubject(c.Request.Context(), input)
	if err != nil {
		switch err {
		case subject.ErrSubjectNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subject"})
		}
		return
	}

	c.JSON(http.StatusOK, s)
}

func (h *SubjectHandler) DeleteSubject(c *gin.Context) {
	id := c.Param("id")

	err := h.service.DeleteSubject(c.Request.Context(), id)
	if err != nil {
		switch err {
		case subject.ErrSubjectNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete subject"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subject deleted successfully"})
}

func (h *SubjectHandler) ListSubjects(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filter := subject.ListSubjectsFilter{
		Page:  page,
		Limit: limit,
	}

	if categoryID := c.Query("categoryId"); categoryID != "" {
		filter.CategoryID = &categoryID
	}
	if level := c.Query("level"); level != "" {
		filter.Level = &level
	}
	if isPublished := c.Query("isPublished"); isPublished == "true" {
		b := true
		filter.IsPublished = &b
	}
	if isActive := c.Query("isActive"); isActive == "true" {
		b := true
		filter.IsActive = &b
	}
	if isFeatured := c.Query("isFeatured"); isFeatured == "true" {
		b := true
		filter.IsFeatured = &b
	}
	if search := c.Query("search"); search != "" {
		filter.Search = &search
	}

	result, err := h.service.ListSubjects(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list subjects"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"subjects": result.Subjects,
		"pagination": gin.H{
			"page":       result.Page,
			"limit":      result.Limit,
			"total":      result.Total,
			"totalPages": result.TotalPages,
		},
	})
}

func (h *SubjectHandler) UpdateCurriculum(c *gin.Context) {
	subjectID := c.Param("id")

	var input subject.CurriculumInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.service.UpdateCurriculum(c.Request.Context(), subjectID, input)
	if err != nil {
		switch err {
		case subject.ErrSubjectNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update curriculum"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Curriculum updated successfully"})
}

func (h *SubjectHandler) GetCurriculum(c *gin.Context) {
	subjectID := c.Param("id")

	curriculum, err := h.service.GetCurriculum(c.Request.Context(), subjectID)
	if err != nil {
		switch err {
		case subject.ErrSubjectNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch curriculum"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"curriculum": curriculum})
}

func (h *SubjectHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.service.GetDashboardStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}
