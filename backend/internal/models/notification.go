package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type NotificationType string

const (
	NotificationInfo    NotificationType = "INFO"
	NotificationSuccess NotificationType = "SUCCESS"
	NotificationWarning NotificationType = "WARNING"
	NotificationError   NotificationType = "ERROR"
)

type Notification struct {
	ID          string           `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID      string           `gorm:"not null;type:uuid;column:user_id;index:idx_notifications_user_created,priority:1" json:"userId"`
	Title       string           `gorm:"not null;column:title" json:"title"`
	Message     string           `gorm:"not null;type:text;column:message" json:"message"`
	Type        NotificationType `gorm:"default:'INFO';index;column:type" json:"type"`
	Category    string           `gorm:"default:'GENERAL';index;column:category" json:"category"`
	Priority    string           `gorm:"default:'MEDIUM';index;column:priority" json:"priority"`
	Icon        *string          `gorm:"column:icon" json:"icon"`
	Link        *string          `gorm:"column:link" json:"link"`
	ActionURL   string           `gorm:"-" json:"actionUrl,omitempty"` // For backward compatibility
	Status      string           `gorm:"default:'pending';index;column:status" json:"status"`
	Channels    StringArray      `gorm:"type:jsonb;column:channels" json:"channels"`
	BroadcastID string           `gorm:"type:uuid;index;column:broadcast_id" json:"broadcastId,omitempty"`
	Actions     JSONStringArray  `gorm:"type:jsonb;column:actions" json:"actions"`
	IsRead      bool             `gorm:"default:false;index;column:is_read" json:"isRead"`
	CreatedAt   time.Time        `gorm:"index:idx_notifications_user_created,priority:2;column:created_at" json:"createdAt"`
	UpdatedAt   time.Time        `gorm:"column:updated_at" json:"updatedAt"`

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
