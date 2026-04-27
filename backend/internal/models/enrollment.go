package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Enrollment struct {
	ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID     string    `gorm:"not null;index:idx_user_subject,unique;constraint:OnDelete:CASCADE" json:"userId"`
	SubjectID  string    `gorm:"not null;index:idx_user_subject,unique;constraint:OnDelete:CASCADE" json:"subjectId"`
	Progress   float64   `gorm:"default:0;index" json:"progress"`
	EnrolledAt time.Time `gorm:"index" json:"enrolledAt"`
	
	// Relations
	Subject   Subject   `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type LessonProgress struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	UserID    string    `gorm:"not null;index:idx_user_lesson,unique" json:"userId"`
	LessonID  string    `gorm:"not null;index:idx_user_lesson,unique" json:"lessonId"`
	Completed bool      `gorm:"default:false;index" json:"completed"`
	CreatedAt time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (e *Enrollment) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.EnrolledAt.IsZero() {
		e.EnrolledAt = time.Now()
	}
	return
}

func (lp *LessonProgress) BeforeCreate(tx *gorm.DB) (err error) {
	if lp.ID == "" {
		lp.ID = uuid.New().String()
	}
	return
}
