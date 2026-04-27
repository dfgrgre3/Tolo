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
	ID        string    `gorm:"primaryKey" json:"id"`
	SubjectID string    `gorm:"not null;index" json:"subjectId"`
	Title     string    `gorm:"not null" json:"title"`
	Type      ExamType  `gorm:"default:'QUIZ'" json:"type"`
	Duration  int       `json:"duration"` // in minutes
	MaxScore  float64   `gorm:"default:100" json:"maxScore"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	
	// Relations
	Subject   Subject    `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Questions []Question `json:"questions,omitempty"`
}

type Question struct {
	ID      string `gorm:"primaryKey" json:"id"`
	ExamID  string `gorm:"not null;index" json:"examId"`
	Text    string `gorm:"not null" json:"text"`
	Type    string `json:"type"` // MCQ, TRUE_FALSE, TEXT
	Options string `json:"options"` // JSON string of options
	Answer  string `json:"answer"`
}

type ExamResult struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	ExamID    string    `gorm:"not null;index" json:"examId"`
	UserID    string    `gorm:"not null;index" json:"userId"`
	Score     float64   `json:"score"`
	Passed    bool      `json:"passed"`
	TakenAt   time.Time `json:"takenAt"`
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

func (er *ExamResult) BeforeCreate(tx *gorm.DB) (err error) {
	if er.ID == "" {
		er.ID = uuid.New().String()
	}
	return
}

