package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

// UserSettings stores user preferences and settings
type UserSettings struct {
	ID     string `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID string `gorm:"type:uuid;not null;uniqueIndex;column:user_id" json:"userId"`
	User   User   `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE" json:"-"`

	Theme          string `gorm:"default:'light';column:theme" json:"theme"`
	FontSize       string `gorm:"default:'medium';column:font_size" json:"fontSize"`
	ReducedMotion  bool   `gorm:"default:false;column:reduced_motion" json:"reducedMotion"`
	HighContrast   bool   `gorm:"default:false;column:high_contrast" json:"highContrast"`
	CompactMode    bool   `gorm:"default:false;column:compact_mode" json:"compactMode"`
	EfficiencyMode bool   `gorm:"default:false;column:efficiency_mode" json:"efficiencyMode"`

	Language     string `gorm:"default:'ar';column:language" json:"language"`
	NumberFormat string `gorm:"default:'english';column:number_format" json:"numberFormat"`

	NotificationsEnabled bool `gorm:"default:true;column:notifications_enabled" json:"notificationsEnabled"`
	StudyReminders       bool `gorm:"default:true;column:study_reminders" json:"studyReminders"`
	EmailNotifications   bool `gorm:"default:true;column:email_notifications" json:"emailNotifications"`
	PushNotifications    bool `gorm:"default:true;column:push_notifications" json:"pushNotifications"`

	TaskReminders        bool   `gorm:"default:true;column:task_reminders" json:"taskReminders"`
	TaskReminderTime     string `gorm:"default:'30';column:task_reminder_time" json:"taskReminderTime"`
	DailyGoalReminders   bool   `gorm:"default:true;column:daily_goal_reminders" json:"dailyGoalReminders"`
	ExamReminders        bool   `gorm:"default:true;column:exam_reminders" json:"examReminders"`
	ExamReminderDays     int    `gorm:"default:3;column:exam_reminder_days" json:"examReminderDays"`
	DeadlineReminders    bool   `gorm:"default:true;column:deadline_reminders" json:"deadlineReminders"`
	ProgressReports      bool   `gorm:"default:true;column:progress_reports" json:"progressReports"`
	WeeklyReport         bool   `gorm:"default:true;column:weekly_report" json:"weeklyReport"`
	AchievementAlerts    bool   `gorm:"default:true;column:achievement_alerts" json:"achievementAlerts"`
	CommentNotifications bool   `gorm:"default:true;column:comment_notifications" json:"commentNotifications"`
	MentionNotifications bool   `gorm:"default:true;column:mention_notifications" json:"mentionNotifications"`
	PushEnabled          bool   `gorm:"default:true;column:push_enabled" json:"pushEnabled"`
	EmailEnabled         bool   `gorm:"default:true;column:email_enabled" json:"emailEnabled"`
	SmsEnabled           bool   `gorm:"default:false;column:sms_enabled" json:"smsEnabled"`
	QuietHoursEnabled    bool   `gorm:"default:false;column:quiet_hours_enabled" json:"quietHoursEnabled"`
	QuietHoursStart      string `gorm:"default:'22:00';column:quiet_hours_start" json:"quietHoursStart"`
	QuietHoursEnd        string `gorm:"default:'07:00';column:quiet_hours_end" json:"quietHoursEnd"`
	SoundEnabled         bool   `gorm:"default:true;column:sound_enabled" json:"soundEnabled"`
	VibrationEnabled     bool   `gorm:"default:true;column:vibration_enabled" json:"vibrationEnabled"`

	ProfileVisibility string `gorm:"default:'public';column:profile_visibility" json:"profileVisibility"`
	ShowOnlineStatus  bool   `gorm:"default:true;column:show_online_status" json:"showOnlineStatus"`
	ShowProgress      bool   `gorm:"default:true;column:show_progress" json:"showProgress"`

	CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
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
