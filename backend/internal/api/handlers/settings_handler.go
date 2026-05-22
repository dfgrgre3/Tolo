package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type userSettingsL1Entry struct {
	settings  models.UserSettings
	expiresAt time.Time
}

var (
	userSettingsL1    sync.Map
	userSettingsL1TTL = 5 * time.Minute
)

// GetSettings retrieves user settings/preferences
func GetSettings(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists || userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	uid := userID.(string)

	var settings models.UserSettings

	if db.DB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Database connection is not initialized",
		})
		return
	}

	if raw, ok := userSettingsL1.Load(uid); ok {
		entry := raw.(*userSettingsL1Entry)
		if time.Now().Before(entry.expiresAt) {
			api_response.Success(c, gin.H{"settings": entry.settings})
			return
		}
		userSettingsL1.Delete(uid)
	}

	// Use struct-based query to let GORM handle naming strategy correctly
	readDB := db.ReadDB()
	if readDB == nil {
		readDB = db.DB
	}
	result := readDB.Where(&models.UserSettings{UserID: uid}).First(&settings)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Printf("INFO: Creating default settings for user %v", userID)
			// Create default settings for user
			settings = models.UserSettings{
				UserID:               uid,
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
				db.DB.Where(&models.UserSettings{UserID: uid}).First(&settings)
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

	userSettingsL1.Store(uid, &userSettingsL1Entry{settings: settings, expiresAt: time.Now().Add(userSettingsL1TTL)})
	api_response.Success(c, gin.H{"settings": settings})
}

// UpdateSettings updates user settings/preferences
func UpdateSettings(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("CRITICAL: Panic in UpdateSettings: %v", r)
			api_response.Error(c, http.StatusInternalServerError, "Internal server error during settings update")
			c.Abort()
		}
	}()

	userID, exists := c.Get("userId")
	if !exists || userID == nil {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var patch map[string]interface{}
	if err := c.ShouldBindJSON(&patch); err != nil {
		log.Printf("ERROR: UpdateSettings - ShouldBindJSON failed for user %v: %v", userID, err)
		api_response.Error(c, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	log.Printf("DEBUG: UpdateSettings - User %v patch received: %+v", userID, patch)

	settings, err := fetchOrCreateUserSettings(userID.(string))
	if err != nil {
		log.Printf("ERROR: UpdateSettings - fetchOrCreateUserSettings failed for user %v: %v", userID, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch or create settings: "+err.Error())
		return
	}

	log.Printf("DEBUG: UpdateSettings - Current settings before patch: theme=%v", settings.Theme)

	applySettingsPatch(&settings, patch)

	log.Printf("DEBUG: UpdateSettings - Settings after patch: theme=%v", settings.Theme)

	if err := db.DB.Save(&settings).Error; err != nil {
		log.Printf("ERROR: UpdateSettings - DB.Save failed for user %v: %v", userID, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to update settings")
		return
	}

	log.Printf("INFO: UpdateSettings - Successfully updated settings for user %v", userID)
	userSettingsL1.Store(userID.(string), &userSettingsL1Entry{settings: settings, expiresAt: time.Now().Add(userSettingsL1TTL)})
	api_response.Success(c, gin.H{"settings": settings})
}

func fetchOrCreateUserSettings(userID string) (models.UserSettings, error) {
	var settings models.UserSettings

	if db.DB == nil {
		return settings, fmt.Errorf("database connection is nil")
	}

	result := db.DB.Where(&models.UserSettings{UserID: userID}).First(&settings)

	if result.Error == nil {
		return settings, nil
	}

	if result.Error != gorm.ErrRecordNotFound {
		log.Printf("ERROR: Failed to fetch settings for user %v: %v", userID, result.Error)
		return settings, result.Error
	}

	log.Printf("INFO: Creating default settings for user %v", userID)
	settings = models.UserSettings{
		UserID:               userID,
		Theme:                "light",
		FontSize:             "medium",
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

	if err := db.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&settings).Error; err != nil {
		log.Printf("ERROR: Failed to create settings for user %v: %v", userID, err)
		return settings, err
	}

	if settings.ID == "" {
		db.DB.Where(&models.UserSettings{UserID: userID}).First(&settings)
	}

	return settings, nil
}

func applySettingsPatch(settings *models.UserSettings, patch map[string]interface{}) {
	applyUISettings(settings, patch)
	applyNotificationSettings(settings, patch)
	applyPrivacySettings(settings, patch)
	applyAdvancedSettings(settings, patch)
}

func applyUISettings(settings *models.UserSettings, patch map[string]interface{}) {
	if v, ok := patch["theme"].(string); ok {
		settings.Theme = v
	}
	if v, ok := patch["fontSize"].(string); ok {
		settings.FontSize = v
	}
	if v, ok := patch["reducedMotion"].(bool); ok {
		settings.ReducedMotion = v
	}
	if v, ok := patch["highContrast"].(bool); ok {
		settings.HighContrast = v
	}
	if v, ok := patch["compactMode"].(bool); ok {
		settings.CompactMode = v
	}
	if v, ok := patch["efficiencyMode"].(bool); ok {
		settings.EfficiencyMode = v
	}
	if v, ok := patch["language"].(string); ok {
		settings.Language = v
	}
	if v, ok := patch["numberFormat"].(string); ok {
		settings.NumberFormat = v
	}
}

func applyNotificationSettings(settings *models.UserSettings, patch map[string]interface{}) {
	if v, ok := patch["notificationsEnabled"].(bool); ok {
		settings.NotificationsEnabled = v
	}
	if v, ok := patch["studyReminders"].(bool); ok {
		settings.StudyReminders = v
	}
	if v, ok := patch["emailNotifications"].(bool); ok {
		settings.EmailNotifications = v
	}
	if v, ok := patch["pushNotifications"].(bool); ok {
		settings.PushNotifications = v
	}
}

func applyPrivacySettings(settings *models.UserSettings, patch map[string]interface{}) {
	if v, ok := patch["profileVisibility"].(string); ok {
		settings.ProfileVisibility = v
	}
	if v, ok := patch["showOnlineStatus"].(bool); ok {
		settings.ShowOnlineStatus = v
	}
	if v, ok := patch["showProgress"].(bool); ok {
		settings.ShowProgress = v
	}
}

func applyAdvancedSettings(settings *models.UserSettings, patch map[string]interface{}) {
	applyReminderSettings(settings, patch)
	applyReportAndAlertSettings(settings, patch)
	applyChannelSettings(settings, patch)
	applyQuietHoursAndSoundSettings(settings, patch)
}

func applyReminderSettings(settings *models.UserSettings, patch map[string]interface{}) {
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
}

func applyReportAndAlertSettings(settings *models.UserSettings, patch map[string]interface{}) {
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
}

func applyChannelSettings(settings *models.UserSettings, patch map[string]interface{}) {
	if v, ok := patch["pushEnabled"].(bool); ok {
		settings.PushEnabled = v
	}
	if v, ok := patch["emailEnabled"].(bool); ok {
		settings.EmailEnabled = v
	}
	if v, ok := patch["smsEnabled"].(bool); ok {
		settings.SmsEnabled = v
	}
}

func applyQuietHoursAndSoundSettings(settings *models.UserSettings, patch map[string]interface{}) {
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
}

// GetSystemSettings retrieves public system settings (feature toggles, etc)
func GetSystemSettings(c *gin.Context) {
	// Initialize defaults outside the closure so they are accessible to recover()
	defaultSettings := map[string]interface{}{
		"siteName":        "Thanawy",
		"siteDescription": "منصة تعليمية لإدارة التعلم والمحتوى.",
		"features": map[string]interface{}{
			"registration": true,
			"engagement":   true,
			"forum":        true,
			"blog":         true,
			"events":       true,
			"aiAssistant":  true,
		},
		"maintenance": map[string]interface{}{
			"enabled": false,
			"message": "",
		},
	}

	defer func() {
		if r := recover(); r != nil {
			log.Printf("CRITICAL: Panic in GetSystemSettings: %v", r)
			// Return a clean success response with defaults even after a panic
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"settings": defaultSettings,
				},
			})
			c.Abort()
		}
	}()

	// Safe DB access
	if db.DB == nil {
		log.Printf("WARN: Database connection is not initialized in GetSystemSettings, returning defaults")
		api_response.Success(c, gin.H{"settings": defaultSettings})
		return
	}

	var dbSetting models.SystemSetting
	var settings map[string]interface{}

	// Attempt to fetch from DB
	err := db.DB.Where("key = ?", "admin_settings").First(&dbSetting).Error
	if err == nil {
		if err := json.Unmarshal([]byte(dbSetting.Value), &settings); err != nil || settings == nil {
			log.Printf("WARN: Failed to unmarshal admin_settings from DB: %v. Using defaults.", err)
			settings = defaultSettings
		}
	} else {
		// Record not found is expected if not seeded yet
		if err != gorm.ErrRecordNotFound {
			log.Printf("ERROR: Failed to fetch admin_settings from DB: %v. Using defaults.", err)
		}
		settings = defaultSettings
	}

	// Double safety check
	if settings == nil {
		settings = defaultSettings
	}

	// Safely extract and filter public settings
	// Use type-safe fallbacks to avoid panics during type assertion
	siteNameFallback, _ := defaultSettings["siteName"].(string)
	siteDescriptionFallback, _ := defaultSettings["siteDescription"].(string)
	featuresFallback, _ := defaultSettings["features"].(map[string]interface{})
	maintenanceFallback, _ := defaultSettings["maintenance"].(map[string]interface{})

	publicSettings := gin.H{
		"siteName":        extractString(settings, "siteName", siteNameFallback),
		"siteDescription": extractString(settings, "siteDescription", siteDescriptionFallback),
		"features":        extractMap(settings, "features", featuresFallback),
		"maintenance":     extractMap(settings, "maintenance", maintenanceFallback),
	}

	api_response.Success(c, gin.H{"settings": publicSettings})
}

// Helper to safely extract string from map
func extractString(m map[string]interface{}, key string, fallback string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return fallback
}

// Helper to safely extract map from map
func extractMap(m map[string]interface{}, key string, fallback map[string]interface{}) map[string]interface{} {
	if val, ok := m[key]; ok {
		if res, ok := val.(map[string]interface{}); ok {
			return res
		}
	}
	return fallback
}
