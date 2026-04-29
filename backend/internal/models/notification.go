package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationType string

const (
	NotificationInfo    NotificationType = "INFO"
	NotificationSuccess NotificationType = "SUCCESS"
	NotificationWarning NotificationType = "WARNING"
	NotificationError   NotificationType = "ERROR"
)

type Notification struct {
	ID        string           `gorm:"primaryKey" json:"id"`
	UserID    string           `gorm:"not null;index:idx_notifications_user_created,priority:1" json:"userId"`
	Title     string           `gorm:"not null" json:"title"`
	Message   string           `gorm:"not null" json:"message"`
	Type      NotificationType `gorm:"default:'INFO'" json:"type"`
	Link      *string          `json:"link"`
	IsRead    bool             `gorm:"default:false;index" json:"isRead"`
	CreatedAt time.Time        `gorm:"index:idx_notifications_user_created,priority:2" json:"createdAt"`
	UpdatedAt time.Time        `json:"updatedAt"`
}

func (Notification) TableName() string {
	return "Notification"
}

func (n *Notification) BeforeCreate(tx *gorm.DB) (err error) {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	return
}
