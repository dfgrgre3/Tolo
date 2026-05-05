package repository

import (
	"thanawy-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type SessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(session *models.UserSession) error {
	return r.db.Create(session).Error
}

func (r *SessionRepository) FindByRefreshToken(token string) (*models.UserSession, error) {
	var session models.UserSession
	err := r.db.Where("refresh_token = ? AND is_active = ?", token, true).First(&session).Error
	return &session, err
}

func (r *SessionRepository) RevokeAllUserSessions(userID string) error {
	return r.db.Model(&models.UserSession{}).
		Where("user_id = ? AND is_active = ?", userID, true).
		Update("is_active", false).Error
}

func (r *SessionRepository) RevokeSessionByJTI(jti string) error {
	return r.db.Model(&models.UserSession{}).
		Where("id = ?", jti).
		Update("is_active", false).Error
}

func (r *SessionRepository) UpdateActivity(id string) error {
	return r.db.Model(&models.UserSession{}).
		Where("id = ?", id).
		Update("last_accessed", time.Now()).Error
}

func (r *SessionRepository) CountActiveSessions(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.UserSession{}).
		Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, time.Now()).
		Count(&count).Error
	return count, err
}

func (r *SessionRepository) GetActiveSessions(userID string) ([]models.UserSession, error) {
	var sessions []models.UserSession
	err := r.db.Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, time.Now()).
		Order("last_accessed asc").
		Find(&sessions).Error
	return sessions, err
}
