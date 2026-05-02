package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type TaskStatus string

const (
	TaskPending   TaskStatus = "PENDING"
	TaskCompleted TaskStatus = "COMPLETED"
)

type Task struct {
	ID            string     `gorm:"primaryKey" json:"id"`
	UserID        string     `gorm:"not null;index:idx_tasks_user_status,priority:1" json:"userId"`
	Title         string     `gorm:"not null" json:"title"`
	Description   *string    `json:"description"`
	Status        TaskStatus `gorm:"default:'PENDING';index:idx_tasks_user_status,priority:2" json:"status"`
	Priority      string     `gorm:"default:'MEDIUM';index" json:"priority"`
	DueAt         *time.Time `gorm:"index" json:"dueAt"`
	EstimatedTime int        `json:"estimatedTime"` // in minutes
	ActualTime    int        `json:"actualTime"`    // in minutes
	CreatedAt     time.Time  `gorm:"index" json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type StudySession struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	UserID      string    `gorm:"not null;index:idx_study_sessions_user_start,priority:1" json:"userId"`
	DurationMin int       `gorm:"default:0" json:"durationMin"`
	FocusScore  int       `gorm:"default:0" json:"focusScore"`
	StartTime   time.Time `gorm:"index:idx_study_sessions_user_start,priority:2" json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	SubjectID   string    `gorm:"index" json:"subjectId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Schedule struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"not null;index" json:"userId"`
	PlanJson  string    `gorm:"type:text" json:"planJson"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Reminder struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"not null;index" json:"userId"`
	Title     string    `gorm:"not null" json:"title"`
	Message   *string   `json:"message"`
	RemindAt  time.Time `json:"remindAt"`
	Type      string    `gorm:"default:'STUDY'" json:"type"`
	Priority  string    `gorm:"default:'MEDIUM'" json:"priority"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (Task) TableName() string {
	return "Task"
}

func (t *Task) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return
}

func (StudySession) TableName() string {
	return "StudySession"
}

func (s *StudySession) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}

func (Schedule) TableName() string {
	return "Schedule"
}

func (sch *Schedule) BeforeCreate(tx *gorm.DB) (err error) {
	if sch.ID == "" {
		sch.ID = uuid.New().String()
	}
	return
}

func (Reminder) TableName() string {
	return "Reminder"
}

func (r *Reminder) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return
}
