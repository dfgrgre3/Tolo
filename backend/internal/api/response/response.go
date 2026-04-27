package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"totalPages"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    data,
	})
}

func Message(c *gin.Context, status int, message string, data interface{}) {
	payload := gin.H{
		"success": status < 400,
		"message": message,
	}
	if data != nil {
		payload["data"] = data
	}
	c.JSON(status, payload)
}

func Error(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{
		"success": false,
		"error":   message,
	})
}

func List(c *gin.Context, items interface{}, pagination Pagination, aliases gin.H) {
	data := gin.H{
		"items":      items,
		"pagination": pagination,
	}
	for key, value := range aliases {
		data[key] = value
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}
