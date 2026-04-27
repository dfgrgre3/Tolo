package models

import (
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
	ID                     string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name                   string    `gorm:"uniqueIndex;not null;index" json:"name"`
	NameAr                 *string   `gorm:"index" json:"nameAr"`
	Code                   *string   `gorm:"uniqueIndex;index" json:"code"`
	Description            *string   `json:"description"`
	Icon                   *string   `json:"icon"`
	Color                  *string   `gorm:"default:'#3b82f6'" json:"color"`
	IsActive               bool      `gorm:"default:true;index" json:"isActive"`
	IsPublished            bool      `gorm:"default:false;index" json:"isPublished"`
	Price                  float64   `gorm:"default:0;index" json:"price"`
	Rating                 float64   `gorm:"default:0" json:"rating"`
	EnrolledCount          int       `gorm:"default:0" json:"enrolledCount"`
	ThumbnailUrl           *string   `json:"thumbnailUrl"`
	TrailerUrl             *string   `json:"trailerUrl"`
	TrailerDurationMinutes int       `gorm:"default:0" json:"trailerDurationMinutes"`
	Slug                   *string   `gorm:"uniqueIndex" json:"slug"`
	Level                  Level     `gorm:"default:'INTERMEDIATE';index" json:"level"`
	InstructorName         *string   `json:"instructorName"`
	InstructorId           *string   `gorm:"index" json:"instructorId"`
	CategoryId             *string   `gorm:"index" json:"categoryId"`
	DurationHours          int       `gorm:"default:0" json:"durationHours"`
	Requirements           *string   `json:"requirements"`
	LearningObjectives     *string   `json:"learningObjectives"`
	SeoTitle               *string   `json:"seoTitle"`
	SeoDescription         *string   `json:"seoDescription"`
	IsFeatured             bool      `gorm:"default:false;index" json:"isFeatured"`
	Language               string    `gorm:"default:'ar';index" json:"language"`
	CreatedAt              time.Time `gorm:"index" json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
	
	// Relations
	Topics         []Topic   `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"topics,omitempty"`
	Enrollments   []Enrollment `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"-"`
}

type Topic struct {
	ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	SubjectID   string    `gorm:"not null;index;type:uuid;constraint:OnDelete:CASCADE" json:"subjectId"`
	Title       string    `gorm:"default:'';index" json:"title"`
	Description *string   `json:"description"`
	Order       int       `gorm:"default:0;index" json:"order"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	
	// Relations
	SubTopics   []SubTopic `gorm:"foreignKey:TopicID;constraint:OnDelete:CASCADE" json:"subTopics,omitempty"`
}

type SubTopic struct {
	ID              string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	TopicID         string    `gorm:"not null;index;type:uuid;constraint:OnDelete:CASCADE" json:"topicId"`
	Title           string    `gorm:"default:'';index" json:"title"`
	Description     *string   `json:"description"`
	Content         *string   `json:"content"`
	VideoUrl        *string   `json:"videoUrl"`
	Order           int       `gorm:"default:0;index" json:"order"`
	DurationMinutes int       `gorm:"default:0" json:"durationMinutes"`
	IsFree          bool      `gorm:"default:false;index" json:"isFree"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

func (s *Subject) BeforeCreate(tx *gorm.DB) (err error) {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return
}

func (t *Topic) BeforeCreate(tx *gorm.DB) (err error) {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return
}

func (st *SubTopic) BeforeCreate(tx *gorm.DB) (err error) {
	if st.ID == "" {
		st.ID = uuid.New().String()
	}
	return
}

