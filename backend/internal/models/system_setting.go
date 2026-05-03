package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type SystemSetting struct {
	ID        string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Key       string         `gorm:"uniqueIndex;not null;column:key" json:"key"`
	Value     string         `gorm:"type:text;column:value" json:"value"` // JSON serialized value
	CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
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
