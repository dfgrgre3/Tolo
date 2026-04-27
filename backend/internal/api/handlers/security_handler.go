package handlers

import (
	"net/http"
	"strconv"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

var securityLogRepo = repository.NewSecurityLogRepository(db.DB)

func GetSecurityLogs(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	logs, err := securityLogRepo.FindByUserID(userId.(string), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch security logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
	})
}

// LogSecurityEvent is a helper function to log security events
// This can be called from other handlers after successful operations
func LogSecurityEvent(userID string, eventType models.SecurityEventType, ip, userAgent string, location *string, metadata *string) error {
	log := &models.SecurityLog{
		UserID:    userID,
		EventType: eventType,
		IP:        ip,
		UserAgent: userAgent,
		Location:  location,
		Metadata:  metadata,
	}
	return securityLogRepo.Create(log)
}
