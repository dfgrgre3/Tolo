package handlers

import (
	"encoding/json"
	"log"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// LogAudit logs an administrative action
func LogAudit(c *gin.Context, action string, resource string, resourceId string, metadata interface{}) {
	userId, _ := c.Get("userId")
	userIdStr := ""
	if userId != nil {
		userIdStr = userId.(string)
	}

	metadataJSON, _ := json.Marshal(metadata)

	auditLog := models.AuditLog{
		UserID:     userIdStr,
		EventType:  action,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceId,
		Metadata:   string(metadataJSON),
		IP:         c.ClientIP(),
		UserAgent:  c.GetHeader("User-Agent"),
	}

	if err := db.DB.Create(&auditLog).Error; err != nil {
		log.Printf("[Audit] Failed to save audit log: %v", err)
	}
}
