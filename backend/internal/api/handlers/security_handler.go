package handlers

import (
	"net/http"
	"strconv"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"

	"fmt"
	"github.com/gin-gonic/gin"
)

var securityLogRepo *repository.SecurityLogRepository

func getSecurityLogRepo() *repository.SecurityLogRepository {
	if securityLogRepo == nil {
		securityLogRepo = repository.NewSecurityLogRepository(db.DB)
	}
	return securityLogRepo
}
func GetSecurityLogs(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userIdStr, ok := userId.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in session"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	logs, err := getSecurityLogRepo().FindByUserID(userIdStr, limit)
	if err != nil {
		fmt.Printf("Error fetching security logs for user %s: %v\n", userIdStr, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch security logs", "details": err.Error()})
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
	return getSecurityLogRepo().Create(log)
}
