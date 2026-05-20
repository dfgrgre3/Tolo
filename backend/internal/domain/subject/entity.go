package subject

import (
	"time"
)

type Subject struct {
	ID                     string
	Name                   string
	NameAr                 *string
	Code                   *string
	Description            *string
	Icon                   *string
	Color                  *string
	Type                   string
	Level                  *string
	Slug                   *string
	ThumbnailUrl           *string
	TrailerUrl             *string
	SeoTitle               *string
	SeoDescription         *string
	InstructorName         *string
	InstructorId           *string
	CategoryId             *string
	Price                  float64
	IsFree                 bool
	IsPublished            bool
	IsActive               bool
	IsFeatured             bool
	Rating                 float64
	EnrolledCount          int
	DurationHours          *float64
	TrailerDurationMinutes *int
	Language               *string
	Requirements           []string
	LearningObjectives     []string
	Topics                 []Topic
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

type Topic struct {
	ID        string
	SubjectID string
	Title     string
	Order     int
	SubTopics []SubTopic
	CreatedAt time.Time
}

type SubTopic struct {
	ID          string
	TopicID     string
	Title       string
	Type        string
	Order       int
	IsFree      bool
	VideoUrl    *string
	Duration    int
	DurationMin int
	Description *string
	CreatedAt   time.Time
}

type CreateSubjectInput struct {
	Name           string
	NameAr         *string
	Description    *string
	Icon           *string
	Color          *string
	Type           string
	Level          *string
	Slug           *string
	ThumbnailUrl   *string
	TrailerUrl     *string
	InstructorName *string
	InstructorId   *string
	CategoryId     *string
	Price          float64
	IsFree         bool
	IsPublished    bool
	IsActive       bool
	Language       *string
}

type UpdateSubjectInput struct {
	ID                     string
	Name                   *string
	NameAr                 *string
	Description            *string
	Icon                   *string
	Color                  *string
	Type                   *string
	Level                  *string
	Slug                   *string
	ThumbnailUrl           *string
	TrailerUrl             *string
	SeoTitle               *string
	SeoDescription         *string
	InstructorName         *string
	InstructorId           *string
	CategoryId             *string
	Price                  *float64
	IsFree                 *bool
	IsPublished            *bool
	IsActive               *bool
	IsFeatured             *bool
	Language               *string
	Requirements           []string
	LearningObjectives     []string
	DurationHours          *float64
	TrailerDurationMinutes *int
}

type ListSubjectsFilter struct {
	CategoryID  *string
	Level       *string
	IsPublished *bool
	IsActive    *bool
	IsFeatured  *bool
	Search      *string
	Page        int
	Limit       int
}

type ListSubjectsResult struct {
	Subjects   []Subject
	Total      int64
	Page       int
	Limit      int
	TotalPages int64
}

type CurriculumInput struct {
	Topics []TopicInput
}

type TopicInput struct {
	ID        string
	Title     string
	Order     int
	SubTopics []SubTopicInput
}

type SubTopicInput struct {
	ID          string
	Title       string
	Type        string
	Order       int
	IsFree      bool
	VideoUrl    *string
	Duration    int
	DurationMin int
	Description *string
}
