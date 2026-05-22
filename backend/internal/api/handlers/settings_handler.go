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
	uid, err := extractUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if db.DB == nil {
		respondSettingsDBError(c)
		return
	}

	if trySettingsL1Cache(c, uid) {
		return
	}

	settings, ok := fetchOrCreateSettingsForGet(c, uid)
	if !ok {
		return
	}

	userSettingsL1.Store(uid, &userSettingsL1Entry{settings: settings, expiresAt: time.Now().Add(userSettingsL1TTL)})
	api_response.Success(c, gin.H{"settings": settings})
}

func extractUserID(c *gin.Context) (string, error) {
	userID, exists := c.Get("userId")
	if !exists || userID == nil {
		return "", fmt.Errorf("unauthorized")
	}
	return userID.(string), nil
}

func respondSettingsDBError(c *gin.Context) {
	c.JSON(http.StatusInternalServerError, gin.H{
		"success": false,
		"error":   "Database connection is not initialized",
	})
}

func trySettingsL1Cache(c *gin.Context, uid string) bool {
	if raw, ok := userSettingsL1.Load(uid); ok {
		entry := raw.(*userSettingsL1Entry)
		if time.Now().Before(entry.expiresAt) {
			api_response.Success(c, gin.H{"settings": entry.settings})
			return true
		}
		userSettingsL1.Delete(uid)
	}
	return false
}

func fetchOrCreateSettingsForGet(c *gin.Context, uid string) (models.UserSettings, bool) {
	readDB := db.ReadDB()
	if readDB == nil {
		readDB = db.DB
	}

	var settings models.UserSettings
	result := readDB.Where(&models.UserSettings{UserID: uid}).First(&settings)

	if result.Error != nil {
		if handleSettingsFetchError(c, uid, result) {
			return settings, false
		}
	}
	return settings, true
}

// handleSettingsFetchError processes the error from fetching settings.
// Returns true if the caller should return (error already written to response).
func handleSettingsFetchError(c *gin.Context, uid string, result *gorm.DB) bool {
	if result.Error != gorm.ErrRecordNotFound {
		log.Printf("ERROR: Failed to fetch settings for user %v: %v", uid, result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch settings",
			"details": result.Error.Error(),
		})
		return true
	}

	settings, err := createDefaultUserSettings(c, uid)
	if err != nil {
		return true
	}

	userSettingsL1.Store(uid, &userSettingsL1Entry{settings: settings, expiresAt: time.Now().Add(userSettingsL1TTL)})
	api_response.Success(c, gin.H{"settings": settings})
	return true
}

func createDefaultUserSettings(c *gin.Context, uid string) (models.UserSettings, error) {
	log.Printf("INFO: Creating default settings for user %v", uid)
	// Create default settings for user
	settings := models.UserSettings{
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
		log.Printf("ERROR: Failed to create settings for user %v: %v", uid, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create settings",
			"details": err.Error(),
		})
		return settings, err
	}

	// Re-fetch to ensure we have the settings if DoNothing was triggered
	if settings.ID == "" {
		db.DB.Where(&models.UserSettings{UserID: uid}).First(&settings)
	}

	return settings, nil
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
	defaultSettings := buildDefaultSystemSettings()

	defer func() {
		if r := recover(); r != nil {
			log.Printf("CRITICAL: Panic in GetSystemSettings: %v", r)
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

	settings := fetchSystemSettings(db.DB, defaultSettings)

	publicSettings := extractPublicSettings(settings, defaultSettings)
	api_response.Success(c, gin.H{"settings": publicSettings})
}

func buildDefaultSystemSettings() map[string]interface{} {
	return map[string]interface{}{
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
}

func fetchSystemSettings(database *gorm.DB, defaultSettings map[string]interface{}) map[string]interface{} {
	var dbSetting models.SystemSetting

	err := database.Where("key = ?", "admin_settings").First(&dbSetting).Error
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			log.Printf("ERROR: Failed to fetch admin_settings from DB: %v. Using defaults.", err)
		}
		return defaultSettings
	}

	var settings map[string]interface{}
	if err := json.Unmarshal([]byte(dbSetting.Value), &settings); err != nil || settings == nil {
		log.Printf("WARN: Failed to unmarshal admin_settings from DB: %v. Using defaults.", err)
		return defaultSettings
	}

	// Double safety check
	if settings == nil {
		return defaultSettings
	}

	return settings
}

func extractPublicSettings(settings, defaultSettings map[string]interface{}) gin.H {
	return gin.H{
		"siteName":        extractString(settings, "siteName", extractString(defaultSettings, "siteName", "Thanawy")),
		"siteDescription": extractString(settings, "siteDescription", extractString(defaultSettings, "siteDescription", "")),
		"features":        extractMap(settings, "features", extractMap(defaultSettings, "features", map[string]interface{}{})),
		"maintenance":     extractMap(settings, "maintenance", extractMap(defaultSettings, "maintenance", map[string]interface{}{})),
	}
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