package handlers

import (
	"net/http"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSettings retrieves user settings/preferences
func GetSettings(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var settings models.UserSettings
	result := db.DB.Where("\"userId\" = ?", userID).First(&settings)
	
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Create default settings for user
			settings = models.UserSettings{
				UserID:              userID.(string),
				Theme:                "light",
				FontSize:             "medium",
				ReducedMotion:        false,
				HighContrast:         false,
				CompactMode:          false,
				EfficiencyMode:       false,
				Language:             "ar",
				NumberFormat:         "english",
				NotificationsEnabled: true,
				StudyReminders:       true,
				EmailNotifications:   true,
				PushNotifications:    true,
				ProfileVisibility:    "public",
				ShowOnlineStatus:     true,
				ShowProgress:         true,
			}
			
			if err := db.DB.Create(&settings).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settings"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"preferences": settings})
}

// UpdateSettings updates user settings/preferences
func UpdateSettings(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var patch map[string]interface{}
	if err := c.ShouldBindJSON(&patch); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var settings models.UserSettings
	result := db.DB.Where("\"userId\" = ?", userID).First(&settings)
	
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Create default settings first
			settings = models.UserSettings{
				UserID:              userID.(string),
				Theme:                "light",
				FontSize:             "medium",
				ReducedMotion:        false,
				HighContrast:         false,
				CompactMode:          false,
				EfficiencyMode:       false,
				Language:             "ar",
				NumberFormat:         "english",
				NotificationsEnabled: true,
				StudyReminders:       true,
				EmailNotifications:   true,
				PushNotifications:    true,
				ProfileVisibility:    "public",
				ShowOnlineStatus:     true,
				ShowProgress:         true,
			}
			
			if err := db.DB.Create(&settings).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settings"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
			return
		}
	}

	// Apply patch updates
	if theme, ok := patch["theme"].(string); ok {
		settings.Theme = theme
	}
	if fontSize, ok := patch["fontSize"].(string); ok {
		settings.FontSize = fontSize
	}
	if reducedMotion, ok := patch["reducedMotion"].(bool); ok {
		settings.ReducedMotion = reducedMotion
	}
	if highContrast, ok := patch["highContrast"].(bool); ok {
		settings.HighContrast = highContrast
	}
	if compactMode, ok := patch["compactMode"].(bool); ok {
		settings.CompactMode = compactMode
	}
	if efficiencyMode, ok := patch["efficiencyMode"].(bool); ok {
		settings.EfficiencyMode = efficiencyMode
	}
	if language, ok := patch["language"].(string); ok {
		settings.Language = language
	}
	if numberFormat, ok := patch["numberFormat"].(string); ok {
		settings.NumberFormat = numberFormat
	}
	if notificationsEnabled, ok := patch["notificationsEnabled"].(bool); ok {
		settings.NotificationsEnabled = notificationsEnabled
	}
	if studyReminders, ok := patch["studyReminders"].(bool); ok {
		settings.StudyReminders = studyReminders
	}
	if emailNotifications, ok := patch["emailNotifications"].(bool); ok {
		settings.EmailNotifications = emailNotifications
	}
	if pushNotifications, ok := patch["pushNotifications"].(bool); ok {
		settings.PushNotifications = pushNotifications
	}
	if profileVisibility, ok := patch["profileVisibility"].(string); ok {
		settings.ProfileVisibility = profileVisibility
	}
	if showOnlineStatus, ok := patch["showOnlineStatus"].(bool); ok {
		settings.ShowOnlineStatus = showOnlineStatus
	}
	if showProgress, ok := patch["showProgress"].(bool); ok {
		settings.ShowProgress = showProgress
	}

	if err := db.DB.Save(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"preferences": settings})
}