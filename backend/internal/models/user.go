package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleStudent UserRole = "STUDENT"
	RoleTeacher UserRole = "TEACHER"
	RoleAdmin   UserRole = "ADMIN"
)

type UserStatus string

const (
	StatusActive    UserStatus = "ACTIVE"
	StatusInactive  UserStatus = "INACTIVE"
	StatusSuspended UserStatus = "SUSPENDED"
	StatusDeleted   UserStatus = "DELETED"
)

type User struct {
	ID                            string         `gorm:"primaryKey;type:text" json:"id"`
	Email                         string         `gorm:"uniqueIndex;not null" json:"email"`
	Name                          *string        `gorm:"index" json:"name"`
	Username                      *string        `gorm:"uniqueIndex" json:"username"`
	Avatar                        *string        `json:"avatar"`
	PasswordHash                  string         `gorm:"not null" json:"-"`
	Role                          UserRole       `gorm:"default:'STUDENT';index" json:"role"`
	Status                        UserStatus     `gorm:"default:'ACTIVE';index" json:"status"`
	CreatedAt                     time.Time      `gorm:"index" json:"createdAt"`
	UpdatedAt                     time.Time      `json:"updatedAt"`
	DeletedAt                     gorm.DeletedAt `gorm:"index" json:"-"`
	
	// Profile fields
	Phone                         *string        `gorm:"index" json:"phone"`
	PhoneVerified                 bool           `gorm:"default:false" json:"phoneVerified"`
	EmailVerified                 bool           `gorm:"default:false;index" json:"emailVerified"`
	Country                       *string        `gorm:"index" json:"country"`
	GradeLevel                    *string        `gorm:"index" json:"gradeLevel"`
	EducationType                 *string        `json:"educationType"`
	Section                       *string        `json:"section"`
	Bio                           *string        `json:"bio"`
	
	// Gamification (Embedded for simplicity or as relations)
	TotalXP                       int            `gorm:"default:0;index" json:"totalXP"`
	Level                         int            `gorm:"default:1;index" json:"level"`
	
	// Access Control
	Permissions                   JSONStringArray `gorm:"type:jsonb" json:"permissions"`

	// Billing & Credits
	Balance                       float64        `gorm:"default:0" json:"balance"`
	AiCredits                     int            `gorm:"default:0" json:"aiCredits"`
	ExamCredits                   int            `gorm:"default:0" json:"examCredits"`

	
	// Relations
	Settings                      *UserSettings  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Enrollments                   []Enrollment   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	LessonProgresses               []LessonProgress `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Tasks                         []Task         `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	StudySessions                 []StudySession `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Schedules                     []Schedule     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Reminders                     []Reminder     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Payments                      []Payment      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	ExamResults                   []ExamResult   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Sessions                      []UserSession  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	SecurityLogs                  []SecurityLog  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
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


