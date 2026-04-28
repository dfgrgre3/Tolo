package models

import (
	"time"
	"gorm.io/gorm"
	"github.com/google/uuid"
)

type UserSession struct {
	ID           string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID       string         `gorm:"not null;index" json:"userId"`
	RefreshToken string         `gorm:"uniqueIndex;not null" json:"-"`
	UserAgent    string         `gorm:"type:text" json:"userAgent"`
	IP           string         `gorm:"not null" json:"ip"`
	Location     *string        `json:"location"`
	DeviceType   string         `json:"deviceType"` // e.g., mobile, desktop
	IsRevoked    bool           `gorm:"default:false;index" json:"isRevoked"`
	LastActive   time.Time      `json:"lastActive"`
	ExpiresAt    time.Time      `gorm:"index" json:"expiresAt"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (s *UserSession) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}
