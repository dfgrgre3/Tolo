package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ExamType string

const (
	ExamTypeQuiz    ExamType = "QUIZ"
	ExamTypeMidterm ExamType = "MIDTERM"
	ExamTypeFinal   ExamType = "FINAL"
)

type Exam struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	SubjectID string    `gorm:"not null;index;type:text" json:"subjectId"`
	Title     string    `gorm:"not null" json:"title"`
	Type      ExamType  `gorm:"default:'QUIZ';index" json:"type"`
	Duration  int       `json:"duration"` // in minutes
	MaxScore  float64   `gorm:"default:100" json:"maxScore"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	
	// Relations
	Subject   Subject    `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"subject,omitempty"`
	Questions []Question `gorm:"foreignKey:ExamID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
}

type Question struct {
	ID      string `gorm:"primaryKey;type:text" json:"id"`
	ExamID  string `gorm:"not null;index;type:text" json:"examId"`
	Text    string `gorm:"not null;type:text" json:"text"`
	Type    string `gorm:"default:'MCQ'" json:"type"` // MCQ, TRUE_FALSE, TEXT
	Options string `gorm:"type:text" json:"options"` // JSON string of options
	Answer  string `gorm:"not null" json:"-"` // Hidden from API responses for security
}

func (Question) TableName() string {
	return "Question"
}

type ExamResult struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	ExamID    string    `gorm:"not null;index:idx_exam_results_exam_user,priority:1;type:text" json:"examId"`
	UserID    string    `gorm:"not null;index:idx_exam_results_exam_user,priority:2;type:text" json:"userId"`
	Score     float64   `json:"score"`
	Passed    bool      `json:"passed"`
	TakenAt   time.Time `gorm:"index" json:"takenAt"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

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
