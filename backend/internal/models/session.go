package models

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserSession struct {
	ID               string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID           string         `gorm:"not null;type:uuid;index;column:user_id" json:"userId"`
	RefreshToken     string         `gorm:"uniqueIndex;not null;column:refresh_token" json:"-"`
	RefreshTokenHash string         `gorm:"uniqueIndex:idx_user_session_refresh_hash;not null;column:refresh_token_hash" json:"-"`
	UserAgent        string         `gorm:"type:text;column:user_agent" json:"userAgent"`
	IP               string         `gorm:"not null;column:ip" json:"ip"`
	Location         *string        `gorm:"column:location" json:"location"`
	DeviceType       string         `gorm:"column:device_type" json:"deviceType"`
	Status           string         `gorm:"default:'active';column:status" json:"status"` // active, expired, revoked
	IsActive         bool           `gorm:"default:true;index;column:is_active" json:"isActive"`
	LastAccessed     time.Time      `gorm:"column:last_accessed" json:"lastActive"`
	ExpiresAt        time.Time      `gorm:"index;column:expires_at" json:"expiresAt"`
	RevokedAt        *time.Time     `gorm:"column:revoked_at" json:"revokedAt,omitempty"`
	RevokedBy        *string        `gorm:"type:uuid;column:revoked_by" json:"revokedBy,omitempty"`
	CreatedAt        time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt        time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt        gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

func (UserSession) TableName() string {
	return "UserSession"
}

func (s *UserSession) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	// Auto-compute hash if refresh_token is set but hash is empty
	if s.RefreshToken != "" && s.RefreshTokenHash == "" {
		s.RefreshTokenHash = ComputeRefreshTokenHash(s.RefreshToken)
	}
	return
}

func (s *UserSession) BeforeUpdate(tx *gorm.DB) (err error) {
	// Auto-update hash if refresh_token changed
	if s.RefreshToken != "" {
		hash := ComputeRefreshTokenHash(s.RefreshToken)
		if hash != s.RefreshTokenHash {
			s.RefreshTokenHash = hash
		}
	}
	return
}

// ComputeRefreshTokenHash computes a SHA-256 hash of the refresh token for fast lookups.
func ComputeRefreshTokenHash(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// IsExpired checks if the session has expired.
func (s *UserSession) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// RefreshSession updates an existing session with new token data (avoids DELETE+INSERT).
func (s *UserSession) RefreshSession(newToken string, newExpiresAt time.Time) {
	s.RefreshToken = newToken
	s.RefreshTokenHash = ComputeRefreshTokenHash(newToken)
	s.LastAccessed = time.Now()
	s.ExpiresAt = newExpiresAt
	s.UpdatedAt = time.Now()
}

// String returns a debug representation (only hash, never the actual token).
func (s *UserSession) String() string {
	return fmt.Sprintf("UserSession{id=%s, user=%s, hash=%s, active=%v, expires=%s}",
		s.ID[:8], s.UserID[:8], s.RefreshTokenHash[:12], s.IsActive, s.ExpiresAt.Format(time.RFC3339))
}
