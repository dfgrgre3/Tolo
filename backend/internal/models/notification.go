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
	ID        string           `gorm:"primaryKey;type:text" json:"id"`
	UserID    string           `gorm:"not null;type:text;index:idx_notifications_user_created,priority:1" json:"userId"`
	Title     string           `gorm:"not null" json:"title"`
	Message   string           `gorm:"not null;type:text" json:"message"`
	Type      NotificationType `gorm:"default:'INFO';index" json:"type"`
	Link      *string          `json:"link"`
	IsRead    bool             `gorm:"default:false;index" json:"isRead"`
	CreatedAt time.Time        `gorm:"index:idx_notifications_user_created,priority:2" json:"createdAt"`
	UpdatedAt time.Time        `json:"updatedAt"`

	// Relations
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
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
