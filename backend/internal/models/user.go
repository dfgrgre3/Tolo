package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleStudent   UserRole = "STUDENT"
	RoleTeacher   UserRole = "TEACHER"
	RoleModerator UserRole = "MODERATOR"
	RoleAdmin     UserRole = "ADMIN"
)

type UserStatus string

const (
	StatusActive    UserStatus = "ACTIVE"
	StatusInactive  UserStatus = "INACTIVE"
	StatusSuspended UserStatus = "SUSPENDED"
	StatusDeleted   UserStatus = "DELETED"
)

type User struct {
	ID           string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null" json:"email"`
	Name         *string        `gorm:"index" json:"name"`
	Username     *string        `gorm:"uniqueIndex" json:"username"`
	Avatar       *string        `json:"avatar"`
	PasswordHash string         `gorm:"not null" json:"-"`
	Role         UserRole       `gorm:"default:'STUDENT';index" json:"role"`
	Status       UserStatus     `gorm:"default:'ACTIVE';index" json:"status"`
	CreatedAt    time.Time      `gorm:"index;column:created_at" json:"createdAt"`
	UpdatedAt    time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	// Profile fields
	Phone         *string `gorm:"index;column:phone" json:"phone"`
	PhoneVerified bool    `gorm:"default:false;column:phone_verified" json:"phoneVerified"`
	EmailVerified bool    `gorm:"default:false;index;column:email_verified" json:"emailVerified"`
	Country       *string `gorm:"index" json:"country"`
	GradeLevel    *string `gorm:"index;column:grade_level" json:"gradeLevel"`
	EducationType *string `gorm:"column:education_type" json:"educationType"`
	Section       *string `gorm:"column:section" json:"section"`
	Bio           *string `gorm:"column:bio" json:"bio"`

	// Add missing fields found in DB
	WakeUpTime                *string    `gorm:"column:wake_up_time" json:"wakeUpTime"`
	SleepTime                 *string    `gorm:"column:sleep_time" json:"sleepTime"`
	FocusStrategy             string     `gorm:"default:'POMODORO';column:focus_strategy" json:"focusStrategy"`
	EmailNotifications        bool       `gorm:"default:true;column:email_notifications" json:"emailNotifications"`
	EmailVerificationToken    *string    `gorm:"column:email_verification_token" json:"-"`
	EmailVerificationExpires  *time.Time `gorm:"column:email_verification_expires" json:"-"`
	PhoneVerificationOTP      *string    `gorm:"column:phone_verification_otp" json:"-"`
	PhoneVerificationExpires  *time.Time `gorm:"column:phone_verification_expires" json:"-"`
	PhoneVerificationAttempts int        `gorm:"default:0;column:phone_verification_attempts" json:"-"`
	PhoneVerificationLastSent *time.Time `gorm:"column:phone_verification_last_sent" json:"-"`
	SMSNotifications          bool       `gorm:"default:false;column:sms_notifications" json:"smsNotifications"`
	BiometricEnabled          bool       `gorm:"default:false;column:biometric_enabled" json:"biometricEnabled"`
	GoogleID                  *string    `gorm:"column:google_id" json:"googleId"`
	GithubID                  *string    `gorm:"column:github_id" json:"githubId"`
	PasswordChangedAt         *time.Time `gorm:"column:password_changed_at" json:"-"`
	PasswordExpiresAt         *time.Time `gorm:"column:password_expires_at" json:"-"`
	DateOfBirth               *time.Time `gorm:"column:date_of_birth" json:"dateOfBirth"`
	AlternativePhone          *string    `gorm:"column:alternative_phone" json:"alternativePhone"`
	InterestedSubjects        []string   `gorm:"type:text[];column:interested_subjects" json:"interestedSubjects"`
	StudyGoal                 *string    `gorm:"column:study_goal" json:"studyGoal"`
	SubjectsTaught            []string   `gorm:"type:text[];column:subjects_taught" json:"subjectsTaught"`
	ClassesTaught             []string   `gorm:"type:text[];column:classes_taught" json:"classesTaught"`
	ExperienceYears           *string    `gorm:"column:experience_years" json:"experienceYears"`
	ReferralCode              *string    `gorm:"column:referral_code" json:"referralCode"`
	AdditionalAiCredits       int        `gorm:"default:0;column:additional_ai_credits" json:"additionalAiCredits"`
	AdditionalExamCredits     int        `gorm:"default:0;column:additional_exam_credits" json:"additionalExamCredits"`
	IsDeleted                 bool       `gorm:"default:false;column:is_deleted" json:"-"`
	LastUsageReset            time.Time  `gorm:"column:last_usage_reset" json:"-"`
	MonthlyAiMessageCount     int        `gorm:"default:0;column:monthly_ai_message_count" json:"-"`
	MonthlyExamCount          int        `gorm:"default:0;column:monthly_exam_count" json:"-"`
	ArchiveReason             *string    `gorm:"column:archive_reason" json:"-"`

	// Gamification (core)
	TotalXP int `gorm:"default:0;index" json:"totalXP"`
	Level   int `gorm:"default:1;index" json:"level"`

	// Gamification (stats - synced periodically or on events)
	CurrentStreak  int `gorm:"default:0" json:"currentStreak"`
	LongestStreak  int `gorm:"default:0" json:"longestStreak"`
	TotalStudyTime int `gorm:"default:0" json:"totalStudyTime"` // in minutes
	TasksCompleted int `gorm:"default:0" json:"tasksCompleted"`
	ExamsPassed    int `gorm:"default:0" json:"examsPassed"`

	// Multi-layer XP system
	StudyXP     int `gorm:"default:0" json:"studyXP"`
	TaskXP      int `gorm:"default:0" json:"taskXP"`
	ExamXP      int `gorm:"default:0" json:"examXP"`
	ChallengeXP int `gorm:"default:0" json:"challengeXP"`
	QuestXP     int `gorm:"default:0" json:"questXP"`
	SeasonXP    int `gorm:"default:0" json:"seasonXP"`

	// Access Control
	Permissions JSONStringArray `gorm:"type:jsonb" json:"permissions"`

	// Billing & Credits
	Balance     float64 `gorm:"default:0" json:"balance"`
	AiCredits   int     `gorm:"default:0" json:"aiCredits"`
	ExamCredits int     `gorm:"default:0" json:"examCredits"`
	Version     int     `gorm:"default:1" json:"-"` // Optimistic locking for balances

	// Subscriptions
	ActiveSubscriptionID  *string    `gorm:"index;type:uuid;column:active_subscription_id" json:"activeSubscriptionId"`
	SubscriptionExpiresAt *time.Time `gorm:"index" json:"subscriptionExpiresAt"`

	// Security & Auth
	LastLogin            *time.Time `gorm:"index" json:"lastLogin"`
	TwoFactorEnabled     bool       `gorm:"default:false" json:"twoFactorEnabled"`
	TwoFactorSecret      *string    `json:"-"`
	ResetPasswordToken   *string    `gorm:"index" json:"-"`
	ResetPasswordExpires *time.Time `json:"-"`
	MagicLinkToken       *string    `gorm:"index" json:"-"`
	MagicLinkExpires     *time.Time `json:"-"`
	VerificationToken    *string    `gorm:"index" json:"-"`
	VerificationExpires  *time.Time `json:"-"`

	// Relations
	Settings           *UserSettings       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Enrollments        []Enrollment        `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	LessonProgresses   []LessonProgress    `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Tasks              []Task              `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	StudySessions      []StudySession      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Schedules          []Schedule          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Reminders          []Reminder          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Payments           []Payment           `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	ExamResults        []ExamResult        `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Sessions           []UserSession       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	SecurityLogs       []SecurityLog       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	WalletTransactions []WalletTransaction `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func permissionGrantMatches(grant, required string) bool {
	if grant == required || grant == PermAdminBypass {
		return true
	}
	if grant == "*:manage" {
		return strings.HasSuffix(required, ":manage")
	}
	if len(grant) > 2 && strings.HasSuffix(grant, ":*") {
		mod := grant[:len(grant)-2]
		return strings.HasPrefix(required, mod+":")
	}
	return false
}

func (u *User) HasPermission(permission string) bool {
	effective := u.GetEffectivePermissions()
	for _, p := range effective {
		if permissionGrantMatches(p, permission) {
			return true
		}
	}
	return false
}

func (u *User) GetEffectivePermissions() []string {
	perms := []string(u.Permissions)

	if u.Role == RoleAdmin {
		if !slices.Contains(perms, PermAdminBypass) {
			return append(perms, PermAdminBypass)
		}
		return perms
	}

	// Add default permissions based on role if not already present
	defaults := GetDefaultPermissions(u.Role)
	for _, dp := range defaults {
		if !slices.Contains(perms, dp) {
			perms = append(perms, dp)
		}
	}

	return perms
}

func GetDefaultPermissions(role UserRole) []string {
	switch role {
	case RoleAdmin:
		return []string{"*:*"}
	case RoleModerator:
		return []string{
			PermDashboardView, PermAnalyticsView, PermReportsView,
			PermUsersView, PermStudentsView, PermTeachersView,
			PermSubjectsView, PermExamsView, PermBlogView,
			PermForumView, PermForumModerate, PermCommentsView, PermCommentsModerate,
			PermEventsView, PermAnnouncementsView, PermAuditLogsView,
			PermLiveMonitorView, PermMarketingView,
		}
	case RoleTeacher:
		return []string{
			PermDashboardView, PermAnalyticsView,
			PermStudentsView, PermSubjectsView, PermOwnSubjectsManage,
			PermBooksView, PermOwnBooksManage, PermResourcesView, PermOwnResourcesManage,
			PermExamsView, PermOwnExamsManage, PermChallengesView, PermOwnChallengesManage,
		}
	default:
		return []string{}
	}
}

// GetName returns the user's name or a default value if not set
func (u *User) GetName() string {
	if u.Name != nil && *u.Name != "" {
		return *u.Name
	}
	return "Unknown User"
}

func (User) TableName() string {
	return "User"
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return
}

type JSONStringArray []string

func (a *JSONStringArray) Scan(value interface{}) error {
	if value == nil {
		*a = JSONStringArray{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("failed to scan JSONStringArray: %v", value)
	}

	return json.Unmarshal(bytes, a)
}

func (a JSONStringArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "[]", nil
	}
	bytes, err := json.Marshal(a)
	return string(bytes), err
}

// MarshalJSON ensures we always return [] instead of null for empty arrays
func (a JSONStringArray) MarshalJSON() ([]byte, error) {
	if a == nil {
		return []byte("[]"), nil
	}
	return json.Marshal([]string(a))
}

// GormDataType returns the data type for GORM
func (JSONStringArray) GormDataType() string {
	return "json"
}
