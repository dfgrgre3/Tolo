package models

import (
	"time"
	"gorm.io/gorm"
	"github.com/google/uuid"
)

type SecurityEventType string

const (
	SecurityEventLoginSuccess       SecurityEventType = "LOGIN_SUCCESS"
	SecurityEventLoginFailed       SecurityEventType = "LOGIN_FAILED"
	SecurityEventLogout             SecurityEventType = "LOGOUT"
	SecurityEventRegister           SecurityEventType = "REGISTER"
	SecurityEventPasswordChange     SecurityEventType = "PASSWORD_CHANGE"
	SecurityEventMagicLinkRequested SecurityEventType = "MAGIC_LINK_REQUESTED"
	SecurityEventDeviceTrustChange  SecurityEventType = "DEVICE_TRUST_CHANGE"
	SecurityEventSuspiciousActivity SecurityEventType = "SUSPICIOUS_ACTIVITY"
)

type SecurityLog struct {
	ID        string           `gorm:"primaryKey;type:text" json:"id"`
	UserID    string           `gorm:"type:text;not null;index:idx_security_logs_user_created,priority:1" json:"userId"`
	EventType SecurityEventType `gorm:"not null;index" json:"eventType"`
	IP        string           `gorm:"column:ip;not null" json:"ip"`
	UserAgent string           `gorm:"type:text" json:"userAgent"`
	Location  *string          `json:"location"`
	Metadata  *string          `gorm:"type:text" json:"metadata"` // JSON string for additional data
	CreatedAt time.Time        `gorm:"not null;index:idx_security_logs_user_created,priority:2" json:"createdAt"`
	UpdatedAt time.Time        `json:"updatedAt"`
}

func (SecurityLog) TableName() string {
	return "SecurityLog"
}

func (s *SecurityLog) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}
