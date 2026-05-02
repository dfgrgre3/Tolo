package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type SystemSetting struct {
	ID        string         `gorm:"primaryKey;type:text" json:"id"`
	Key       string         `gorm:"uniqueIndex;not null" json:"key"`
	Value     string         `gorm:"type:text" json:"value"` // JSON serialized value
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (SystemSetting) TableName() string {
	return "SystemSetting"
}

func (s *SystemSetting) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}
