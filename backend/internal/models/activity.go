package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type TaskStatus string

const (
	TaskPending    TaskStatus = "PENDING"
	TaskInProgress TaskStatus = "IN_PROGRESS"
	TaskCompleted  TaskStatus = "COMPLETED"
	TaskCancelled  TaskStatus = "CANCELLED"
)

type Task struct {
	ID            string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID        string         `gorm:"not null;type:uuid;index:idx_tasks_user_status,priority:1;column:user_id" json:"userId"`
	Title         string         `gorm:"not null;column:title" json:"title"`
	Description   *string        `gorm:"column:description" json:"description"`
	Status        TaskStatus     `gorm:"default:'PENDING';index:idx_tasks_user_status,priority:2;column:status" json:"status"`
	Priority      string         `gorm:"default:'MEDIUM';index;column:priority" json:"priority"`
	DueAt         *time.Time     `gorm:"index;column:due_at" json:"dueAt"`
	SubjectID     *string        `gorm:"index;type:uuid;column:subject_id" json:"subjectId"`
	Subject       *Subject       `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	EstimatedTime int            `gorm:"column:estimated_time" json:"estimatedTime"` // in minutes
	ActualTime    int            `gorm:"column:actual_time" json:"actualTime"`    // in minutes
	CreatedAt     time.Time      `gorm:"index;column:created_at" json:"createdAt"`
	UpdatedAt     time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type StudySession struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID      string         `gorm:"not null;type:uuid;index:idx_study_sessions_user_start,priority:1;column:user_id" json:"userId"`
	DurationMin int            `gorm:"default:0;column:duration_min" json:"durationMin"`
	FocusScore  int            `gorm:"default:0;column:focus_score" json:"focusScore"`
	StartTime   time.Time      `gorm:"index:idx_study_sessions_user_start,priority:2;column:start_time" json:"startTime"`
	EndTime     time.Time      `gorm:"column:end_time" json:"endTime"`
	SubjectID   *string        `gorm:"index;type:uuid;column:subject_id;constraint:OnDelete:SET NULL" json:"subjectId"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type Schedule struct {
	ID        string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID    string         `gorm:"not null;type:uuid;index;column:user_id" json:"userId"`
	PlanJson  string         `gorm:"type:text;column:plan_json" json:"planJson"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type Reminder struct {
	ID        string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID    string         `gorm:"not null;type:uuid;index;column:user_id" json:"userId"`
	Title     string         `gorm:"not null;column:title" json:"title"`
	Message   *string        `gorm:"column:message" json:"message"`
	RemindAt  time.Time      `gorm:"column:remind_at" json:"remindAt"`
	Type      string         `gorm:"default:'STUDY';column:type" json:"type"`
	Priority  string         `gorm:"default:'MEDIUM';column:priority" json:"priority"`
	IsActive  bool           `gorm:"default:true;index;column:is_active" json:"isActive"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
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