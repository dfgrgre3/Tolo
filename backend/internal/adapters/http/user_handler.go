package http

import (
	"net/http"
	"strconv"

	"thanawy-backend/internal/domain/user"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	service *user.Service
}

func NewUserHandler(service *user.Service) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var input user.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	u, err := h.service.CreateUser(c.Request.Context(), input)
	if err != nil {
		switch err {
		case user.ErrInvalidEmail, user.ErrInvalidPassword:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case user.ErrUserExists:
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		}
		return
	}

	c.JSON(http.StatusCreated, u)
}

func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")

	u, err := h.service.GetUser(c.Request.Context(), id)
	if err != nil {
		if err == user.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	c.JSON(http.StatusOK, u)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var input user.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input.ID = id

	u, err := h.service.UpdateUser(c.Request.Context(), input)
	if err != nil {
		switch err {
		case user.ErrUserNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		}
		return
	}

	c.JSON(http.StatusOK, u)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	requesterID, _ := c.Get("userId")

	err := h.service.DeleteUser(c.Request.Context(), id, requesterID.(string))
	if err != nil {
		switch err {
		case user.ErrUserNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case user.ErrCannotDeleteSelf:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filter := user.ListUsersFilter{
		Page:  page,
		Limit: limit,
	}

	if role := c.Query("role"); role != "" {
		r := user.Role(role)
		filter.Role = &r
	}
	if status := c.Query("status"); status != "" {
		s := user.Status(status)
		filter.Status = &s
	}
	if search := c.Query("search"); search != "" {
		filter.Search = &search
	}

	result, err := h.service.ListUsers(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": result.Users,
		"pagination": gin.H{
			"page":       result.Page,
			"limit":      result.Limit,
			"total":      result.Total,
			"totalPages": result.TotalPages,
		},
	})
}

func (h *UserHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.service.GetDashboardStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch dashboard stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}
