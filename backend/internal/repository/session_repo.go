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
	err := r.db.Where("refresh_token = ? AND is_revoked = ?", token, false).First(&session).Error
	return &session, err
}

func (r *SessionRepository) RevokeAllUserSessions(userID string) error {
	return r.db.Model(&models.UserSession{}).
		Where("user_id = ? AND is_revoked = ?", userID, false).
		Update("is_revoked", true).Error
}

func (r *SessionRepository) RevokeSessionByJTI(jti string) error {
	return r.db.Model(&models.UserSession{}).
		Where("id = ?", jti).
		Update("is_revoked", true).Error
}

func (r *SessionRepository) UpdateActivity(id string) error {
	return r.db.Model(&models.UserSession{}).
		Where("id = ?", id).
		Update("last_active", time.Now()).Error
}
