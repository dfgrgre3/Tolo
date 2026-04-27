package models

import (
	"time"
	"gorm.io/gorm"
	"github.com/google/uuid"
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
	ID                            string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
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
	Permissions                   []string       `gorm:"type:text[]" json:"permissions"`
	
	// Relations
	Enrollments                   []Enrollment   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	LessonProgresses               []LessonProgress `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return
}

