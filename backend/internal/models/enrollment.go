package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type ProgressStatus string

const (
	ProgressStatusNotStarted ProgressStatus = "NOT_STARTED"
	ProgressStatusInProgress ProgressStatus = "IN_PROGRESS"
	ProgressStatusCompleted  ProgressStatus = "COMPLETED"
)

type Enrollment struct {
	ID         string    `gorm:"primaryKey;type:text" json:"id"`
	UserID     string    `gorm:"not null;type:text;index:idx_user_subject,unique;constraint:OnDelete:CASCADE" json:"userId"`
	SubjectID  string    `gorm:"not null;type:text;index:idx_user_subject,unique;constraint:OnDelete:CASCADE" json:"subjectId"`
	Progress   float64   `gorm:"default:0;index" json:"progress"`
	EnrolledAt time.Time `gorm:"index" json:"enrolledAt"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Subject Subject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	User    User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Enrollment) TableName() string {
	return "SubjectEnrollment"
}

type LessonProgress struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	UserID              string         `gorm:"not null;type:text;index:idx_user_lesson,unique" json:"userId"`
	LessonID            string         `gorm:"column:subTopicId;not null;type:text;index:idx_user_lesson,unique" json:"lessonId"`
	Status              ProgressStatus `gorm:"default:'NOT_STARTED';index" json:"status"`
	Completed           bool           `gorm:"default:false;index" json:"completed"`
	TimeSpentSeconds    int            `gorm:"default:0" json:"timeSpentSeconds"`
	LastWatchedPosition int            `gorm:"default:0" json:"lastWatchedPosition"` // e.g., seconds into a video
	CreatedAt time.Time      `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (LessonProgress) TableName() string {
	return "TopicProgress"
}

func (e *Enrollment) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.EnrolledAt.IsZero() {
		e.EnrolledAt = time.Now()
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now()
	}
	if e.UpdatedAt.IsZero() {
		e.UpdatedAt = time.Now()
	}
	return
}

func (lp *LessonProgress) BeforeCreate(tx *gorm.DB) (err error) {
	if lp.ID == "" {
		lp.ID = uuid.New().String()
	}
	return
}
