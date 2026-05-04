package services

import (
	"fmt"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

// PushNotificationService handles push notification operations
type PushNotificationService struct {
	fcmClient interface{} // Would be *firebase.App in production
	apnsClient interface{} // Would be APNs client in production
}

var pushNotificationServiceInstance *PushNotificationService

// GetPushNotificationService returns the singleton push notification service
func GetPushNotificationService() *PushNotificationService {
	if pushNotificationServiceInstance == nil {
		pushNotificationServiceInstance = &PushNotificationService{
			// Initialize FCM and APNs clients here
		}
	}
	return pushNotificationServiceInstance
}

// Send sends a push notification to a device
func (s *PushNotificationService) Send(token string, title, body string, data map[string]interface{}) error {
	// In production, this would:
	// 1. Determine platform from token format
	// 2. Send via FCM for Android/Web
	// 3. Send via APNs for iOS

	// For now, just log and return success
	fmt.Printf("[PushNotification] Would send to token %s: %s - %s\n", token[:min(10, len(token))], title, body)

	return nil
}

// SendToUser sends push notifications to all devices of a user
func (s *PushNotificationService) SendToUser(userID, title, body string, data map[string]interface{}) error {
	var tokens []models.PushToken
	if err := db.DB.Where("user_id = ? AND is_active = ?", userID, true).Find(&tokens).Error; err != nil {
		return err
	}

	for _, token := range tokens {
		if err := s.Send(token.Token, title, body, data); err != nil {
			// Mark token as potentially invalid
			if s.IsInvalidTokenError(err) {
				token.IsActive = false
				db.DB.Save(&token)
			}
		}
	}

	return nil
}

// IsInvalidTokenError checks if an error indicates an invalid token
func (s *PushNotificationService) IsInvalidTokenError(err error) bool {
	if err == nil {
		return false
	}

	errorStr := err.Error()
	// Common error messages indicating invalid token
	invalidTokenErrors := []string{
		"invalid registration",
		"not registered",
		"invalid token",
		"unregistered",
		"device token",
	}

	for _, msg := range invalidTokenErrors {
		if contains(errorStr, msg) {
			return true
		}
	}

	return false
}

// RegisterToken registers a new push token for a user
func (s *PushNotificationService) RegisterToken(userID, token, platform, provider string) error {
	// Check if token already exists
	var existing models.PushToken
	if err := db.DB.Where("token = ?", token).First(&existing).Error; err == nil {
		// Token exists, update user and mark active
		existing.UserID = userID
		existing.IsActive = true
		existing.Platform = platform
		existing.Provider = provider
		return db.DB.Save(&existing).Error
	}

	// Create new token
	newToken := models.PushToken{
		UserID:   userID,
		Token:    token,
		Platform: platform,
		Provider: provider,
		IsActive: true,
	}

	return db.DB.Create(&newToken).Error
}

// UnregisterToken deactivates a push token
func (s *PushNotificationService) UnregisterToken(token string) error {
	return db.DB.Model(&models.PushToken{}).
		Where("token = ?", token).
		Update("is_active", false).Error
}

// UnregisterAllUserTokens deactivates all tokens for a user
func (s *PushNotificationService) UnregisterAllUserTokens(userID string) error {
	return db.DB.Model(&models.PushToken{}).
		Where("user_id = ?", userID).
		Update("is_active", false).Error
}

// GetUserTokens gets all active tokens for a user
func (s *PushNotificationService) GetUserTokens(userID string) ([]models.PushToken, error) {
	var tokens []models.PushToken
	if err := db.DB.Where("user_id = ? AND is_active = ?", userID, true).Find(&tokens).Error; err != nil {
		return nil, err
	}
	return tokens, nil
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
