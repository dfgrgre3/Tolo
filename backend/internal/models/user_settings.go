package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

// UserSettings stores user preferences and settings
type UserSettings struct {
	ID     string `gorm:"primaryKey;type:text" json:"id"`
	UserID string `gorm:"type:text;not null;uniqueIndex" json:"userId"`
	User   User   `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE" json:"-"`

	// Appearance settings
	Theme          string `gorm:"default:'light'" json:"theme"`     // light, dark, system
	FontSize       string `gorm:"default:'medium'" json:"fontSize"` // small, medium, large
	ReducedMotion  bool   `gorm:"default:false" json:"reducedMotion"`
	HighContrast   bool   `gorm:"default:false" json:"highContrast"`
	CompactMode    bool   `gorm:"default:false" json:"compactMode"`
	EfficiencyMode bool   `gorm:"default:false" json:"efficiencyMode"`

	// Language settings
	Language     string `gorm:"default:'ar'" json:"language"`          // ar, en, etc.
	NumberFormat string `gorm:"default:'english'" json:"numberFormat"` // english, arabic

	// Notification settings
	NotificationsEnabled bool `gorm:"default:true" json:"notificationsEnabled"`
	StudyReminders       bool `gorm:"default:true" json:"studyReminders"`
	EmailNotifications   bool `gorm:"default:true" json:"emailNotifications"`
	PushNotifications    bool `gorm:"default:true" json:"pushNotifications"`

	// Extended notification settings
	TaskReminders        bool   `gorm:"default:true" json:"taskReminders"`
	TaskReminderTime     string `gorm:"default:'30'" json:"taskReminderTime"`
	DailyGoalReminders   bool   `gorm:"default:true" json:"dailyGoalReminders"`
	ExamReminders        bool   `gorm:"default:true" json:"examReminders"`
	ExamReminderDays     int    `gorm:"default:3" json:"examReminderDays"`
	DeadlineReminders    bool   `gorm:"default:true" json:"deadlineReminders"`
	ProgressReports      bool   `gorm:"default:true" json:"progressReports"`
	WeeklyReport         bool   `gorm:"default:true" json:"weeklyReport"`
	AchievementAlerts    bool   `gorm:"default:true" json:"achievementAlerts"`
	CommentNotifications bool   `gorm:"default:true" json:"commentNotifications"`
	MentionNotifications bool   `gorm:"default:true" json:"mentionNotifications"`
	PushEnabled          bool   `gorm:"default:true" json:"pushEnabled"`
	EmailEnabled         bool   `gorm:"default:true" json:"emailEnabled"`
	SmsEnabled           bool   `gorm:"default:false" json:"smsEnabled"`
	QuietHoursEnabled    bool   `gorm:"default:false" json:"quietHoursEnabled"`
	QuietHoursStart      string `gorm:"default:'22:00'" json:"quietHoursStart"`
	QuietHoursEnd        string `gorm:"default:'07:00'" json:"quietHoursEnd"`
	SoundEnabled         bool   `gorm:"default:true" json:"soundEnabled"`
	VibrationEnabled     bool   `gorm:"default:true" json:"vibrationEnabled"`

	// Privacy settings
	ProfileVisibility string `gorm:"default:'public'" json:"profileVisibility"` // public, friends, private
	ShowOnlineStatus  bool   `gorm:"default:true" json:"showOnlineStatus"`
	ShowProgress      bool   `gorm:"default:true" json:"showProgress"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UserSettings) TableName() string {
	return "UserSettings"
}

func (s *UserSettings) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}
