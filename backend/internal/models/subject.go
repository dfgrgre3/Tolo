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
	ID                     string  `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Name                   string  `gorm:"uniqueIndex;not null;index;column:name" json:"name"`
	NameAr                 *string `gorm:"index;column:name_ar" json:"nameAr"`
	Code                   *string `gorm:"uniqueIndex;index;column:code" json:"code"`
	Description            *string `gorm:"column:description" json:"description"`
	Icon                   *string `gorm:"column:icon" json:"icon"`
	Color                  *string `gorm:"default:'#3b82f6';column:color" json:"color"`
	IsActive               bool    `gorm:"default:true;index;column:is_active" json:"isActive"`
	IsPublished            bool    `gorm:"default:false;index;column:is_published" json:"isPublished"`
	Price                  float64 `gorm:"default:0;index;column:price" json:"price"`
	Rating                 float64 `gorm:"default:0;column:rating" json:"rating"`
	EnrolledCount          int     `gorm:"default:0;column:enrolled_count" json:"enrolledCount"`
	ThumbnailUrl           *string `gorm:"column:thumbnail_url" json:"thumbnailUrl"`
	TrailerUrl             *string `gorm:"column:trailer_url" json:"trailerUrl"`
	TrailerDurationMinutes int     `gorm:"default:0;column:trailer_duration_minutes" json:"trailerDurationMinutes"`
	Slug                   *string `gorm:"uniqueIndex;column:slug" json:"slug"`
	Level                  Level   `gorm:"default:'INTERMEDIATE';index;column:level" json:"level"`
	InstructorName         *string `gorm:"column:instructor_name" json:"instructorName"`
	InstructorId           *string `gorm:"index;type:uuid;column:instructor_id" json:"instructorId"`
	CategoryId             *string `gorm:"index;type:uuid;column:category_id" json:"categoryId"`
	DurationHours          int     `gorm:"default:0;column:duration_hours" json:"durationHours"`
	Requirements           *string `gorm:"column:requirements" json:"requirements"`
	LearningObjectives     *string `gorm:"column:learning_objectives" json:"learningObjectives"`
	SeoTitle               *string `gorm:"column:seo_title" json:"seoTitle"`
	SeoDescription         *string `gorm:"column:seo_description" json:"seoDescription"`
	IsFeatured             bool    `gorm:"default:false;index;column:is_featured" json:"isFeatured"`
	Language               string  `gorm:"default:'ar';index;column:language" json:"language"`

	// New fields to match DB and frontend
	CoursePrerequisites StringArray `gorm:"type:text[];column:course_prerequisites" json:"coursePrerequisites"`
	TargetAudience      StringArray `gorm:"type:text[];column:target_audience" json:"targetAudience"`
	WhatYouLearn        StringArray `gorm:"type:text[];column:what_you_learn" json:"whatYouLearn"`
	CompletionRate      float64     `gorm:"default:0;column:completion_rate" json:"completionRate"`
	VideoCount          int         `gorm:"default:0;column:video_count" json:"videoCount"`
	Type                string      `gorm:"default:'COURSE';column:type" json:"type"`
	LastContentUpdate   *time.Time  `gorm:"column:last_content_update" json:"lastContentUpdate"`

	CreatedAt time.Time      `gorm:"index;column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	// Relations
	Topics      []Topic      `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"topics,omitempty"`
	Enrollments []Enrollment `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"-"`
}

type Topic struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	SubjectID   string         `gorm:"not null;index;type:uuid;constraint:OnDelete:CASCADE;column:subject_id" json:"subjectId"`
	Title       string         `gorm:"default:'';index;column:title" json:"title"`
	Description *string        `gorm:"column:description" json:"description"`
	Order       int            `gorm:"default:0;index;column:order" json:"order"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

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
	ID              string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	TopicID         string         `gorm:"not null;index;type:uuid;constraint:OnDelete:CASCADE;column:topic_id" json:"topicId"`
	Title           string         `gorm:"default:'';index;column:title" json:"title"`
	Description     *string        `gorm:"column:description" json:"description"`
	Content         *string        `gorm:"column:content" json:"content"`
	VideoUrl        *string        `gorm:"column:video_url" json:"videoUrl"`
	Type            SubTopicType   `gorm:"default:'VIDEO';index;column:type" json:"type"`
	ExamID          *string        `gorm:"index;type:uuid;column:exam_id" json:"examId"`
	Order           int            `gorm:"default:0;index;column:order" json:"order"`
	DurationMinutes int            `gorm:"default:0;column:duration_minutes" json:"durationMinutes"`
	IsFree          bool           `gorm:"default:false;index;column:is_free" json:"isFree"`
	CreatedAt       time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	// Relations
	Attachments []LessonAttachment `gorm:"foreignKey:SubTopicID;constraint:OnDelete:CASCADE" json:"attachments,omitempty"`
	Exam        *Exam              `gorm:"foreignKey:ExamID" json:"exam,omitempty"`
}

type LessonAttachment struct {
	ID         string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	SubTopicID string         `gorm:"not null;index;type:uuid;column:sub_topic_id;constraint:OnDelete:CASCADE" json:"subTopicId"`
	Title      string         `gorm:"not null;column:title" json:"title"`
	FileUrl    string         `gorm:"not null;column:file_url" json:"fileUrl"`
	FileType   string         `gorm:"column:file_type" json:"fileType"` // PDF, ZIP, etc.
	FileSize   int64          `gorm:"column:file_size" json:"fileSize"`
	CreatedAt  time.Time      `gorm:"column:created_at" json:"createdAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type CourseReview struct {
	ID        string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	SubjectID string         `gorm:"not null;index:idx_user_subject_review,unique;type:uuid;column:subject_id;constraint:OnDelete:CASCADE" json:"subjectId"`
	UserID    string         `gorm:"not null;index:idx_user_subject_review,unique;type:uuid;column:user_id;constraint:OnDelete:CASCADE" json:"userId"`
	Rating    int            `gorm:"not null;default:5;column:rating" json:"rating"`
	Comment   string         `gorm:"type:text;column:comment" json:"comment"`
	IsVisible bool           `gorm:"default:true;column:is_visible" json:"isVisible"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

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
