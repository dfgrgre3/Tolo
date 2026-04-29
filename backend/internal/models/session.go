package models

import (
	"time"
	"gorm.io/gorm"
	"github.com/google/uuid"
)

type UserSession struct {
	ID           string         `gorm:"primaryKey;type:text" json:"id"`
	UserID       string         `gorm:"not null;type:text;index" json:"userId"`
	RefreshToken string         `gorm:"uniqueIndex;not null" json:"-"`
	UserAgent    string         `gorm:"type:text" json:"userAgent"`
	IP           string         `gorm:"not null;column:ip" json:"ip"`
	Location     *string        `json:"location"`
	DeviceType   string         `json:"deviceType"` // e.g., mobile, desktop
	IsActive     bool           `gorm:"default:true;index" json:"isActive"`
	LastAccessed time.Time      `json:"lastActive"`
	ExpiresAt    time.Time      `gorm:"index" json:"expiresAt"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UserSession) TableName() string {
	return "Session"
}

func (s *UserSession) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}
