package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type AuditLog struct {
	ID         string    `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID     string    `gorm:"index;type:uuid;column:user_id" json:"userId"`
	User       *User     `json:"user"`
	EventType  string    `gorm:"index;not null;column:event_type" json:"eventType"` // alias for Action
	Action     string    `gorm:"column:action" json:"action"`                       // legacy support
	Resource   string    `gorm:"column:resource" json:"resource"`
	ResourceID string    `gorm:"column:resource_id" json:"resourceId"`
	Changes    string    `gorm:"type:text;column:changes" json:"changes"`
	Metadata   string    `gorm:"type:text;column:metadata" json:"metadata"` // JSON string
	IP         string    `gorm:"column:ip_address" json:"ip"`
	UserAgent  string    `gorm:"column:user_agent" json:"userAgent"`
	DeviceInfo string    `gorm:"column:device_info" json:"deviceInfo"`
	Location   string    `gorm:"column:location" json:"location"`
	CreatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP;column:created_at" json:"createdAt"`
}

func (AuditLog) TableName() string { return "AuditLog" }
func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now()
	}
	return nil
}
