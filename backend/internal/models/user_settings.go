package models

import (
	"time"
	"gorm.io/gorm"
	"github.com/google/uuid"
)

// UserSettings stores user preferences and settings
type UserSettings struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;uniqueIndex;index" json:"userId"`
	// Note: Foreign key constraint removed temporarily to avoid migration issues
	// User      User      `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
	
	// Appearance settings
	Theme          string `gorm:"default:'light'" json:"theme"`          // light, dark, system
	FontSize       string `gorm:"default:'medium'" json:"fontSize"`       // small, medium, large
	ReducedMotion  bool   `gorm:"default:false" json:"reducedMotion"`
	HighContrast   bool   `gorm:"default:false" json:"highContrast"`
	CompactMode    bool   `gorm:"default:false" json:"compactMode"`
	EfficiencyMode bool   `gorm:"default:false" json:"efficiencyMode"`
	
	// Language settings
	Language     string `gorm:"default:'ar'" json:"language"`      // ar, en, etc.
	NumberFormat string `gorm:"default:'english'" json:"numberFormat"` // english, arabic
	
	// Notification settings
	NotificationsEnabled bool `gorm:"default:true" json:"notificationsEnabled"`
	StudyReminders       bool `gorm:"default:true" json:"studyReminders"`
	EmailNotifications   bool `gorm:"default:true" json:"emailNotifications"`
	PushNotifications    bool `gorm:"default:true" json:"pushNotifications"`
	
	// Privacy settings
	ProfileVisibility string `gorm:"default:'public'" json:"profileVisibility"` // public, friends, private
	ShowOnlineStatus  bool   `gorm:"default:true" json:"showOnlineStatus"`
	ShowProgress      bool   `gorm:"default:true" json:"showProgress"`
	
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (s *UserSettings) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}