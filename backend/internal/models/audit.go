package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type AuditLog struct {
	ID         string    `gorm:"primaryKey" json:"id"`
	UserID     string    `gorm:"index" json:"userId"`
	User       *User     `json:"user"`
	EventType  string    `gorm:"index;not null" json:"eventType"` // alias for Action
	Action     string    `json:"action"`                        // legacy support
	Resource   string    `json:"resource"`
	ResourceID string    `json:"resourceId"`
	Changes    string    `gorm:"type:text" json:"changes"`
	Metadata   string    `gorm:"type:text" json:"metadata"` // JSON string
	IP         string    `json:"ip"`
	UserAgent  string    `json:"userAgent"`
	DeviceInfo string    `json:"deviceInfo"`
	Location   string    `json:"location"`
	CreatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"createdAt"`
}

func (AuditLog) TableName() string { return "AuditLog" }
func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" { a.ID = uuid.New().String() }
	if a.CreatedAt.IsZero() { a.CreatedAt = time.Now() }
	return nil
}
