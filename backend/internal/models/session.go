package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type UserSession struct {
	ID           string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID       string         `gorm:"not null;type:uuid;index;column:user_id" json:"userId"`
	RefreshToken string         `gorm:"uniqueIndex;not null;column:refresh_token" json:"-"`
	UserAgent    string         `gorm:"type:text;column:user_agent" json:"userAgent"`
	IP           string         `gorm:"not null;column:ip" json:"ip"`
	Location     *string        `gorm:"column:location" json:"location"`
	DeviceType   string         `gorm:"column:device_type" json:"deviceType"`
	Status       string         `gorm:"default:'active';column:status" json:"status"` // active, expired, revoked
	IsActive     bool           `gorm:"default:true;index;column:is_active" json:"isActive"`
	LastAccessed time.Time      `gorm:"column:last_accessed" json:"lastActive"`
	ExpiresAt    time.Time      `gorm:"index;column:expires_at" json:"expiresAt"`
	RevokedAt    *time.Time     `gorm:"column:revoked_at" json:"revokedAt,omitempty"`
	RevokedBy    *string        `gorm:"type:uuid;column:revoked_by" json:"revokedBy,omitempty"`
	CreatedAt    time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt    time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

func (UserSession) TableName() string {
	return "UserSession"
}

func (s *UserSession) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}
