package handlers

import (
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/services"
)

// LogAudit logs an administrative action asynchronously
func LogAudit(c *gin.Context, action string, resource string, resourceId string, metadata interface{}) {
	userId, _ := c.Get("userId")
	userIdStr := ""
	if userId != nil {
		if id, ok := userId.(string); ok {
			userIdStr = id
		}
	}

	services.GetAuditService().LogAsync(
		userIdStr,
		action,
		resource,
		resourceId,
		metadata,
		c.ClientIP(),
		c.Request.UserAgent(),
	)
}
