package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type BlogPost struct {
	ID          string          `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title       string          `gorm:"not null;column:title" json:"title"`
	Slug        string          `gorm:"uniqueIndex;not null;column:slug" json:"slug"`
	Content     string          `gorm:"type:text;column:content" json:"content"`
	AuthorID    string          `gorm:"index;type:uuid;column:author_id" json:"authorId"`
	Author      *User           `gorm:"foreignKey:AuthorID;constraint:OnDelete:SET NULL" json:"author,omitempty"`
	CategoryID  string          `gorm:"index;type:uuid;column:category_id" json:"categoryId"`
	Tags        JSONStringArray `gorm:"type:jsonb;column:tags" json:"tags"`
	Status      string          `gorm:"default:'DRAFT';column:status" json:"status"` // DRAFT, PUBLISHED
	Image       string          `gorm:"column:image" json:"image"`
	Views       int             `gorm:"default:0;column:views" json:"views"`
	PublishedAt *time.Time      `gorm:"column:published_at" json:"publishedAt"`
	CreatedAt   time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time       `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt  `gorm:"index;column:deleted_at" json:"-"`
}

type ForumCategory struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Name        string         `gorm:"not null;column:name" json:"name"`
	Description string         `gorm:"column:description" json:"description"`
	Icon        string         `gorm:"column:icon" json:"icon"`
	Order       int            `gorm:"default:0;column:order" json:"order"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type ForumTopic struct {
	ID         string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title      string         `gorm:"not null;column:title" json:"title"`
	Content    string         `gorm:"type:text;column:content" json:"content"`
	AuthorID   string         `gorm:"index;type:uuid;column:author_id" json:"authorId"`
	Author     *User          `gorm:"foreignKey:AuthorID;constraint:OnDelete:SET NULL" json:"author,omitempty"`
	CategoryID string         `gorm:"index;type:uuid;column:category_id" json:"categoryId"`
	Views      int            `gorm:"default:0;column:views" json:"views"`
	IsPinned   bool           `gorm:"default:false;column:is_pinned" json:"isPinned"`
	IsLocked   bool           `gorm:"default:false;column:is_locked" json:"isLocked"`
	CreatedAt  time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt  time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type LiveEvent struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title       string         `gorm:"not null;column:title" json:"title"`
	Description string         `gorm:"column:description" json:"description"`
	Type        string         `gorm:"default:'LIVE';column:type" json:"type"`
	Status      string         `gorm:"default:'UPCOMING';column:status" json:"status"`
	StartTime   time.Time      `gorm:"column:start_time" json:"startTime"`
	EndTime     time.Time      `gorm:"column:end_time" json:"endTime"`
	Speaker     string         `gorm:"column:speaker" json:"speaker"`
	JoinLink    string         `gorm:"column:join_link" json:"joinLink"`
	Image       string         `gorm:"column:image" json:"image"`
	SubjectID   *string        `gorm:"index;type:uuid;column:subject_id;constraint:OnDelete:SET NULL" json:"subjectId"`
	Subject     *Subject       `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type Book struct {
	ID          string          `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title       string          `gorm:"not null;column:title" json:"title"`
	Author      string          `gorm:"column:author" json:"author"`
	Description string          `gorm:"column:description" json:"description"`
	CoverUrl    string          `gorm:"column:cover_url" json:"coverUrl"`
	DownloadUrl string          `gorm:"column:download_url" json:"downloadUrl"`
	SubjectID   *string         `gorm:"index;type:uuid;column:subject_id;constraint:OnDelete:SET NULL" json:"subjectId"`
	Subject     *Subject        `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Price       float64         `gorm:"default:0;column:price" json:"price"`
	IsFree      bool            `gorm:"default:true;column:is_free" json:"isFree"`
	Rating      float64         `gorm:"default:0;column:rating" json:"rating"`
	Views       int             `gorm:"default:0;column:views" json:"views"`
	Downloads   int             `gorm:"default:0;column:downloads" json:"downloads"`
	Tags        JSONStringArray `gorm:"type:jsonb;column:tags" json:"tags"`
	CreatedAt   time.Time       `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time       `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt  `gorm:"index;column:deleted_at" json:"-"`
}

// Event represents platform events (workshops, webinars, competitions, etc.)
// This is distinct from LiveEvent which is for live streaming sessions.
type Event struct {
	ID             string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title          string         `gorm:"not null;column:title" json:"title"`
	Description    *string        `gorm:"column:description" json:"description"`
	Type           string         `gorm:"default:'workshop';column:type" json:"type"`
	StartDate      time.Time      `gorm:"column:start_date" json:"startDate"`
	EndDate        time.Time      `gorm:"column:end_date" json:"endDate"`
	Location       *string        `gorm:"column:location" json:"location"`
	IsOnline       bool           `gorm:"default:true;column:is_online" json:"isOnline"`
	MaxAttendees   *int           `gorm:"column:max_attendees" json:"maxAttendees"`
	AttendeesCount int            `gorm:"default:0;column:attendees_count" json:"attendeesCount"`
	IsActive       bool           `gorm:"default:true;column:is_active" json:"isActive"`
	CreatedAt      time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

func (BlogPost) TableName() string { return "BlogPost" }
func (b *BlogPost) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

func (ForumCategory) TableName() string { return "ForumCategory" }
func (f *ForumCategory) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}

func (ForumTopic) TableName() string { return "ForumTopic" }
func (f *ForumTopic) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" {
		f.ID = uuid.New().String()
	}
	return nil
}

func (LiveEvent) TableName() string { return "LiveEvent" }
func (le *LiveEvent) BeforeCreate(tx *gorm.DB) error {
	if le.ID == "" {
		le.ID = uuid.New().String()
	}
	return nil
}

func (Book) TableName() string { return "Book" }
func (b *Book) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

func (Event) TableName() string { return "Event" }
func (e *Event) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}
