package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Level string

const (
	LevelBeginner     Level = "BEGINNER"
	LevelIntermediate Level = "INTERMEDIATE"
	LevelAdvanced     Level = "ADVANCED"
)

type Subject struct {
	ID                     string  `gorm:"primaryKey;type:text" json:"id"`
	Name                   string  `gorm:"uniqueIndex;not null;index" json:"name"`
	NameAr                 *string `gorm:"index" json:"nameAr"`
	Code                   *string `gorm:"uniqueIndex;index" json:"code"`
	Description            *string `json:"description"`
	Icon                   *string `json:"icon"`
	Color                  *string `gorm:"default:'#3b82f6'" json:"color"`
	IsActive               bool    `gorm:"default:true;index" json:"isActive"`
	IsPublished            bool    `gorm:"default:false;index" json:"isPublished"`
	Price                  float64 `gorm:"default:0;index" json:"price"`
	Rating                 float64 `gorm:"default:0" json:"rating"`
	EnrolledCount          int     `gorm:"default:0" json:"enrolledCount"`
	ThumbnailUrl           *string `json:"thumbnailUrl"`
	TrailerUrl             *string `json:"trailerUrl"`
	TrailerDurationMinutes int     `gorm:"default:0" json:"trailerDurationMinutes"`
	Slug                   *string `gorm:"uniqueIndex" json:"slug"`
	Level                  Level   `gorm:"default:'INTERMEDIATE';index" json:"level"`
	InstructorName         *string `json:"instructorName"`
	InstructorId           *string `gorm:"index" json:"instructorId"`
	CategoryId             *string `gorm:"index" json:"categoryId"`
	DurationHours          int     `gorm:"default:0" json:"durationHours"`
	Requirements           *string `json:"requirements"`
	LearningObjectives     *string `json:"learningObjectives"`
	SeoTitle               *string `json:"seoTitle"`
	SeoDescription         *string `json:"seoDescription"`
	IsFeatured             bool    `gorm:"default:false;index" json:"isFeatured"`
	Language               string  `gorm:"default:'ar';index" json:"language"`

	// New fields to match DB and frontend
	CoursePrerequisites StringArray `gorm:"type:text[]" json:"coursePrerequisites"`
	TargetAudience      StringArray `gorm:"type:text[]" json:"targetAudience"`
	WhatYouLearn        StringArray `gorm:"type:text[]" json:"whatYouLearn"`
	CompletionRate      float64     `gorm:"default:0" json:"completionRate"`
	VideoCount          int         `gorm:"default:0" json:"videoCount"`
	Type                string      `gorm:"default:'COURSE'" json:"type"`
	LastContentUpdate   *time.Time  `json:"lastContentUpdate"`

	CreatedAt time.Time      `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Topics      []Topic      `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"topics,omitempty"`
	Enrollments []Enrollment `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"-"`
}

type Topic struct {
	ID          string    `gorm:"primaryKey;type:text" json:"id"`
	SubjectID   string    `gorm:"not null;index;type:text;constraint:OnDelete:CASCADE" json:"subjectId"`
	Title       string    `gorm:"default:'';index" json:"title"`
	Description *string   `json:"description"`
	Order       int       `gorm:"default:0;index" json:"order"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	SubTopics []SubTopic `gorm:"foreignKey:TopicID;constraint:OnDelete:CASCADE" json:"subTopics,omitempty"`
}

type SubTopicType string

const (
	SubTopicVideo      SubTopicType = "VIDEO"
	SubTopicQuiz       SubTopicType = "QUIZ"
	SubTopicArticle    SubTopicType = "ARTICLE"
	SubTopicAssignment SubTopicType = "ASSIGNMENT"
)

type SubTopic struct {
	ID              string       `gorm:"primaryKey;type:text" json:"id"`
	TopicID         string       `gorm:"not null;index;type:text;constraint:OnDelete:CASCADE" json:"topicId"`
	Title           string       `gorm:"default:'';index" json:"title"`
	Description     *string      `json:"description"`
	Content         *string      `json:"content"`
	VideoUrl        *string      `json:"videoUrl"`
	Type            SubTopicType `gorm:"default:'VIDEO';index" json:"type"`
	ExamID          *string      `gorm:"index" json:"examId"`
	Order           int          `gorm:"default:0;index" json:"order"`
	DurationMinutes int          `gorm:"default:0" json:"durationMinutes"`
	IsFree          bool         `gorm:"default:false;index" json:"isFree"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Attachments []LessonAttachment `gorm:"foreignKey:SubTopicID;constraint:OnDelete:CASCADE" json:"attachments,omitempty"`
	Exam        *Exam              `gorm:"foreignKey:ExamID" json:"exam,omitempty"`
}

type LessonAttachment struct {
	ID         string    `gorm:"primaryKey;type:text" json:"id"`
	SubTopicID string    `gorm:"not null;index;type:text;constraint:OnDelete:CASCADE" json:"subTopicId"`
	Title      string    `gorm:"not null" json:"title"`
	FileUrl    string    `gorm:"not null" json:"fileUrl"`
	FileType   string    `json:"fileType"` // PDF, ZIP, etc.
	FileSize   int64     `json:"fileSize"`
	CreatedAt  time.Time      `json:"createdAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

type CourseReview struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	SubjectID string    `gorm:"not null;index:idx_user_subject_review,unique;type:text;constraint:OnDelete:CASCADE" json:"subjectId"`
	UserID    string    `gorm:"not null;index:idx_user_subject_review,unique;type:text;constraint:OnDelete:CASCADE" json:"userId"`
	Rating    int       `gorm:"not null;default:5" json:"rating"`
	Comment   string    `gorm:"type:text" json:"comment"`
	IsVisible bool      `gorm:"default:true" json:"isVisible"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Subject) TableName() string {
	return "Subject"
}

func (s *Subject) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}

func (Topic) TableName() string {
	return "Topic"
}

func (t *Topic) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return
}

func (SubTopic) TableName() string {
	return "SubTopic"
}

func (st *SubTopic) BeforeCreate(tx *gorm.DB) (err error) {
	if st.ID == "" {
		st.ID = uuid.New().String()
	}
	return
}

func (LessonAttachment) TableName() string {
	return "LessonAttachment"
}

func (la *LessonAttachment) BeforeCreate(tx *gorm.DB) (err error) {
	if la.ID == "" {
		la.ID = uuid.New().String()
	}
	return
}

func (CourseReview) TableName() string {
	return "CourseReview"
}

func (cr *CourseReview) BeforeCreate(tx *gorm.DB) (err error) {
	if cr.ID == "" {
		cr.ID = uuid.New().String()
	}
	return
}

type StringArray []string

func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	switch v := value.(type) {
	case string:
		if v == "" {
			*a = []string{}
			return nil
		}
		// Handle Postgres array format: {val1,val2}
		if strings.HasPrefix(v, "{") && strings.HasSuffix(v, "}") {
			v = strings.Trim(v, "{}")
			if v == "" {
				*a = []string{}
				return nil
			}
			// This is a simple split, doesn't handle quoted strings with commas
			// but should be enough for most cases
			*a = strings.Split(v, ",")
			return nil
		}
		// Handle JSON array format: ["val1","val2"]
		if strings.HasPrefix(v, "[") && strings.HasSuffix(v, "]") {
			return json.Unmarshal([]byte(v), a)
		}
		// Fallback: single string
		*a = []string{v}
		return nil
	case []byte:
		return a.Scan(string(v))
	case []interface{}:
		res := make([]string, len(v))
		for i, val := range v {
			res[i] = fmt.Sprint(val)
		}
		*a = res
		return nil
	default:
		// If it's already a slice or something GORM can handle
		rv := fmt.Sprint(v)
		return a.Scan(rv)
	}
}

func (a StringArray) Value() (driver.Value, error) {
	if a == nil || len(a) == 0 {
		return "{}", nil
	}
	
	// Format as PostgreSQL array: {"val1","val2"}
	var sb strings.Builder
	sb.WriteString("{")
	for i, v := range a {
		if i > 0 {
			sb.WriteString(",")
		}
		v = strings.ReplaceAll(v, `\`, `\\`)
		v = strings.ReplaceAll(v, `"`, `\"`)
		sb.WriteString(`"`)
		sb.WriteString(v)
		sb.WriteString(`"`)
	}
	sb.WriteString("}")
	return sb.String(), nil
}
