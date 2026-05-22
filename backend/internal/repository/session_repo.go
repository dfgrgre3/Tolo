package repository

import (
	"errors"
	"thanawy-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

var (
	ErrSessionNotFound = errors.New("session not found")
	ErrSessionExpired  = errors.New("session has expired")
)

// SessionRepository handles database operations for user sessions.
// Optimized for fast refresh_token lookup using SHA-256 hash.
type SessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// Create inserts a new user session.
func (r *SessionRepository) Create(session *models.UserSession) error {
	return r.db.Create(session).Error
}

// FindByRefreshToken finds an active session by refresh token hash.
// Uses a covering index to avoid heap lookups entirely.
func (r *SessionRepository) FindByRefreshToken(token string) (*models.UserSession, error) {
	tokenHash := models.ComputeRefreshTokenHash(token)
	return r.findByHash(tokenHash)
}

// findByHash is the internal implementation that searches by hash.
func (r *SessionRepository) findByHash(hash string) (*models.UserSession, error) {
	var session models.UserSession
	err := r.db.
		Select("id", "user_id", "refresh_token", "refresh_token_hash", "expires_at",
			"last_accessed", "status", "is_active", "user_agent", "ip", "location", "device_type",
			"created_at", "updated_at").
		Where("refresh_token_hash = ? AND is_active = ?", hash, true).
		Take(&session).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, err
	}
	return &session, nil
}

// RotateToken safely rotates a session's refresh token in a single UPDATE.
// This avoids the expensive DELETE+INSERT pattern that was causing 1500ms+ operations.
// Returns the updated session.
func (r *SessionRepository) RotateToken(id string, oldToken string, newToken string, newExpiresAt time.Time) (*models.UserSession, error) {
	oldHash := models.ComputeRefreshTokenHash(oldToken)
	newHash := models.ComputeRefreshTokenHash(newToken)

	// Single UPDATE query: atomic, uses primary key index (fastest possible).
	result := r.db.Model(&models.UserSession{}).
		Where("id = ? AND refresh_token_hash = ? AND is_active = ?", id, oldHash, true).
		Updates(map[string]interface{}{
			"refresh_token":      newToken,
			"refresh_token_hash": newHash,
			"last_accessed":      time.Now(),
			"expires_at":         newExpiresAt,
		})

	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, ErrSessionNotFound
	}

	// Fetch the updated session
	return r.FindByRefreshToken(newToken)
}

// RevokeAllUserSessions revokes all active sessions for a user.
func (r *SessionRepository) RevokeAllUserSessions(userID string) error {
	return r.db.Model(&models.UserSession{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Updates(map[string]interface{}{
			"is_active":  false,
			"status":     "revoked",
			"revoked_at": time.Now(),
		}).Error
}

// RevokeSessionByJTI revokes a specific session by its ID (JTI).
func (r *SessionRepository) RevokeSessionByJTI(jti string) error {
	return r.db.Model(&models.UserSession{}).
		Where("id = ? AND is_active = ?", jti, true).
		Updates(map[string]interface{}{
			"is_active":  false,
			"status":     "revoked",
			"revoked_at": time.Now(),
		}).Error
}

// RevokeSessionByToken revokes a session by its refresh token (for logout).
func (r *SessionRepository) RevokeSessionByToken(token string) error {
	hash := models.ComputeRefreshTokenHash(token)
	return r.db.Model(&models.UserSession{}).
		Where("refresh_token_hash = ? AND is_active = ?", hash, true).
		Updates(map[string]interface{}{
			"is_active":  false,
			"status":     "revoked",
			"revoked_at": time.Now(),
		}).Error
}

// UpdateActivity updates the last_accessed timestamp for a session.
// Uses a lightweight, targeted UPDATE on a single column.
func (r *SessionRepository) UpdateActivity(id string) error {
	return r.db.Model(&models.UserSession{}).
		Where("id = ? AND is_active = ?", id, true).
		Update("last_accessed", time.Now()).Error
}

// CountActiveSessions counts active, non-expired sessions for a user.
func (r *SessionRepository) CountActiveSessions(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.UserSession{}).
		Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, time.Now()).
		Count(&count).Error
	return count, err
}

// GetActiveSessions returns all active, non-expired sessions for a user.
func (r *SessionRepository) GetActiveSessions(userID string) ([]models.UserSession, error) {
	var sessions []models.UserSession
	err := r.db.
		Select("id", "user_id", "last_accessed", "expires_at", "user_agent", "ip", "location", "device_type", "created_at").
		Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, time.Now()).
		Order("last_accessed asc").
		Find(&sessions).Error
	return sessions, err
}

// CleanupExpiredSessions deletes expired sessions that are older than the retention period.
// Should be called periodically (e.g., via cron job).
func (r *SessionRepository) CleanupExpiredSessions(retentionDays int) (int64, error) {
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	result := r.db.Where("expires_at < ? OR (is_active = ? AND updated_at < ?)", time.Now(), false, cutoff).
		Delete(&models.UserSession{})
	return result.RowsAffected, result.Error
}
