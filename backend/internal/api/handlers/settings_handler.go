package handlers

import (
	"log"
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetSettings retrieves user settings/preferences
func GetSettings(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists || userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var settings models.UserSettings
	// Use struct-based query to let GORM handle naming strategy correctly
	result := db.DB.Where(&models.UserSettings{UserID: userID.(string)}).First(&settings)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Printf("INFO: Creating default settings for user %v", userID)
			// Create default settings for user
			settings = models.UserSettings{
				UserID:               userID.(string),
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
				TaskReminders:        true,
				TaskReminderTime:     "30",
				DailyGoalReminders:   true,
				ExamReminders:        true,
				ExamReminderDays:     3,
				DeadlineReminders:    true,
				ProgressReports:      true,
				WeeklyReport:         true,
				AchievementAlerts:    true,
				CommentNotifications: true,
				MentionNotifications: true,
				PushEnabled:          true,
				EmailEnabled:         true,
				SmsEnabled:           false,
				QuietHoursEnabled:    false,
				QuietHoursStart:      "22:00",
				QuietHoursEnd:        "07:00",
				SoundEnabled:         true,
				VibrationEnabled:     true,
				ProfileVisibility:    "public",
				ShowOnlineStatus:     true,
				ShowProgress:         true,
			}

			// Use OnConflict DO NOTHING to prevent duplicates if concurrent requests try to create settings
			if err := db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&settings).Error; err != nil {
				log.Printf("ERROR: Failed to create settings for user %v: %v", userID, err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to create settings",
					"details": err.Error(),
				})
				return
			}

			// Re-fetch to ensure we have the settings if DoNothing was triggered
			if settings.ID == "" {
				db.DB.Where(&models.UserSettings{UserID: userID.(string)}).First(&settings)
			}
		} else {
			log.Printf("ERROR: Failed to fetch settings for user %v: %v", userID, result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch settings",
				"details": result.Error.Error(),
			})
			return
		}
	}

	api_response.Success(c, gin.H{"settings": settings})
}

// UpdateSettings updates user settings/preferences
func UpdateSettings(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var patch map[string]interface{}
	if err := c.ShouldBindJSON(&patch); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var settings models.UserSettings
	result := db.DB.Where(&models.UserSettings{UserID: userID.(string)}).First(&settings)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Printf("INFO: Creating default settings for user %v during update", userID)
			// Create default settings first
			settings = models.UserSettings{
				UserID:               userID.(string),
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

			// Use OnConflict DO NOTHING to prevent duplicates if concurrent requests try to create settings
			if err := db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&settings).Error; err != nil {
				log.Printf("ERROR: Failed to create settings for user %v during update: %v", userID, err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to create settings",
					"details": err.Error(),
				})
				return
			}

			// Re-fetch to ensure we have the settings if DoNothing was triggered
			if settings.ID == "" {
				db.DB.Where("\"userId\" = ?", userID.(string)).First(&settings)
			}
		} else {
			log.Printf("ERROR: Failed to fetch settings for user %v: %v", userID, result.Error)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch settings",
				"details": result.Error.Error(),
			})
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

	// Extended notification settings
	if v, ok := patch["taskReminders"].(bool); ok {
		settings.TaskReminders = v
	}
	if v, ok := patch["taskReminderTime"].(string); ok {
		settings.TaskReminderTime = v
	}
	if v, ok := patch["dailyGoalReminders"].(bool); ok {
		settings.DailyGoalReminders = v
	}
	if v, ok := patch["examReminders"].(bool); ok {
		settings.ExamReminders = v
	}
	if v, ok := patch["examReminderDays"].(float64); ok {
		settings.ExamReminderDays = int(v)
	}
	if v, ok := patch["deadlineReminders"].(bool); ok {
		settings.DeadlineReminders = v
	}
	if v, ok := patch["progressReports"].(bool); ok {
		settings.ProgressReports = v
	}
	if v, ok := patch["weeklyReport"].(bool); ok {
		settings.WeeklyReport = v
	}
	if v, ok := patch["achievementAlerts"].(bool); ok {
		settings.AchievementAlerts = v
	}
	if v, ok := patch["commentNotifications"].(bool); ok {
		settings.CommentNotifications = v
	}
	if v, ok := patch["mentionNotifications"].(bool); ok {
		settings.MentionNotifications = v
	}
	if v, ok := patch["pushEnabled"].(bool); ok {
		settings.PushEnabled = v
	}
	if v, ok := patch["emailEnabled"].(bool); ok {
		settings.EmailEnabled = v
	}
	if v, ok := patch["smsEnabled"].(bool); ok {
		settings.SmsEnabled = v
	}
	if v, ok := patch["quietHoursEnabled"].(bool); ok {
		settings.QuietHoursEnabled = v
	}
	if v, ok := patch["quietHoursStart"].(string); ok {
		settings.QuietHoursStart = v
	}
	if v, ok := patch["quietHoursEnd"].(string); ok {
		settings.QuietHoursEnd = v
	}
	if v, ok := patch["soundEnabled"].(bool); ok {
		settings.SoundEnabled = v
	}
	if v, ok := patch["vibrationEnabled"].(bool); ok {
		settings.VibrationEnabled = v
	}

		if err := db.DB.Save(&settings).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update settings")
			return
		}

		api_response.Success(c, gin.H{"settings": settings})
	}
