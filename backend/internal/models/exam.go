package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type ExamType string

const (
	ExamTypeQuiz    ExamType = "QUIZ"
	ExamTypeMidterm ExamType = "MIDTERM"
	ExamTypeFinal   ExamType = "FINAL"
)

type Exam struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	SubjectID   string         `gorm:"not null;index;type:uuid;column:subject_id" json:"subjectId"`
	Title       string         `gorm:"not null;column:title" json:"title"`
	Type        ExamType       `gorm:"default:'QUIZ';index;column:type" json:"type"`
	Description string         `gorm:"type:text;column:description" json:"description"`
	Difficulty  string         `gorm:"size:20;default:'medium';column:difficulty" json:"difficulty"`
	IsActive    bool           `gorm:"default:true;column:is_active" json:"isActive"`
	Duration    int            `gorm:"column:duration" json:"duration"`
	MaxScore    float64        `gorm:"default:100;column:max_score" json:"maxScore"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	// Relations
	Subject   Subject    `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"subject,omitempty"`
	Questions []Question `gorm:"foreignKey:ExamID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`

	// Virtual fields
	QuestionCount int64 `gorm:"-" json:"questionCount"`
}

type Question struct {
	ID        string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	ExamID    string         `gorm:"not null;index;type:uuid;column:exam_id" json:"examId"`
	Text      string         `gorm:"not null;type:text;column:text" json:"text"`
	Type      string         `gorm:"default:'MCQ';column:type" json:"type"`
	Options   string         `gorm:"type:text;column:options" json:"options"`
	Answer    string         `gorm:"not null;column:answer" json:"-"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

func (Question) TableName() string {
	return "Question"
}

type ExamResult struct {
	ID        string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	ExamID    string         `gorm:"not null;index:idx_exam_results_exam_user,priority:1;type:uuid;column:exam_id" json:"examId"`
	UserID    string         `gorm:"not null;index:idx_exam_results_exam_user,priority:2;type:uuid;column:user_id" json:"userId"`
	Score     float64        `gorm:"column:score" json:"score"`
	Passed    bool           `gorm:"column:passed" json:"passed"`
	Answers   string         `gorm:"type:text;column:answers" json:"answers"`
	TakenAt   time.Time      `gorm:"index;column:taken_at" json:"takenAt"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Exam Exam `gorm:"foreignKey:ExamID;constraint:OnDelete:CASCADE" json:"exam,omitempty"`
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

func (Exam) TableName() string {
	return "Exam"
}

func (e *Exam) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return
}

func (q *Question) BeforeCreate(tx *gorm.DB) (err error) {
	if q.ID == "" {
		q.ID = uuid.New().String()
	}
	return
}

func (ExamResult) TableName() string {
	return "ExamResult"
}

func (er *ExamResult) BeforeCreate(tx *gorm.DB) (err error) {
	if er.ID == "" {
		er.ID = uuid.New().String()
	}
	return
}
