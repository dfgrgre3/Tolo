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
	ID         string    `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID     string    `gorm:"not null;type:uuid;column:user_id;index:idx_user_subject,unique;constraint:OnDelete:CASCADE" json:"userId"`
	SubjectID  string    `gorm:"not null;type:uuid;column:subject_id;index:idx_user_subject,unique;constraint:OnDelete:CASCADE" json:"subjectId"`
	Progress   float64   `gorm:"default:0;index;column:progress" json:"progress"`
	EnrolledAt time.Time `gorm:"index;column:enrolled_at" json:"enrolledAt"`
	CreatedAt  time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt  time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	// Relations
	Subject Subject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	User    User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Enrollment) TableName() string {
	return "SubjectEnrollment"
}

type LessonProgress struct {
	ID        string    `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID              string         `gorm:"not null;type:uuid;column:user_id;index:idx_user_lesson,unique" json:"userId"`
	LessonID            string         `gorm:"column:sub_topic_id;not null;type:uuid;index:idx_user_lesson,unique" json:"lessonId"`
	Status              ProgressStatus `gorm:"default:'NOT_STARTED';index;column:status" json:"status"`
	Completed           bool           `gorm:"default:false;index;column:completed" json:"completed"`
	TimeSpentSeconds    int            `gorm:"default:0;column:time_spent_seconds" json:"timeSpentSeconds"`
	LastWatchedPosition int            `gorm:"default:0;column:last_watched_position" json:"lastWatchedPosition"`
	CreatedAt time.Time      `gorm:"index;column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
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
