package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type BlogPost struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Slug        string         `gorm:"uniqueIndex;not null" json:"slug"`
	Content     string         `gorm:"type:text" json:"content"`
	AuthorID    string         `gorm:"index;type:text" json:"authorId"`
	Author      *User          `gorm:"foreignKey:AuthorID;constraint:OnDelete:SET NULL" json:"author,omitempty"`
	CategoryID  string         `gorm:"index" json:"categoryId"`
	Tags        JSONStringArray `gorm:"type:jsonb" json:"tags"`
	Status      string         `gorm:"default:'DRAFT'" json:"status"` // DRAFT, PUBLISHED
	Image       string         `json:"image"`
	Views       int            `gorm:"default:0" json:"views"`
	PublishedAt *time.Time     `json:"publishedAt"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type ForumCategory struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description"`
	Icon        string         `json:"icon"`
	Order       int            `gorm:"default:0" json:"order"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type ForumTopic struct {
	ID         string         `gorm:"primaryKey;type:text" json:"id"`
	Title      string         `gorm:"not null" json:"title"`
	Content    string         `gorm:"type:text" json:"content"`
	AuthorID   string         `gorm:"index;type:text" json:"authorId"`
	Author     *User          `gorm:"foreignKey:AuthorID;constraint:OnDelete:SET NULL" json:"author,omitempty"`
	CategoryID string         `gorm:"index" json:"categoryId"`
	Views      int            `gorm:"default:0" json:"views"`
	IsPinned   bool           `gorm:"default:false" json:"isPinned"`
	IsLocked   bool           `gorm:"default:false" json:"isLocked"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

type LiveEvent struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	Type        string         `gorm:"default:'LIVE'" json:"type"` // LIVE, RECORDED, WORKSHOP
	Status      string         `gorm:"default:'UPCOMING'" json:"status"` // UPCOMING, ONGOING, COMPLETED, CANCELLED
	StartTime   time.Time      `json:"startTime"`
	EndTime     time.Time      `json:"endTime"`
	Speaker     string         `json:"speaker"`
	JoinLink    string         `json:"joinLink"`
	Image       string         `json:"image"`
	SubjectID   *string        `gorm:"index;type:text;constraint:OnDelete:SET NULL" json:"subjectId"`
	Subject     *Subject       `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Book struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Author      string         `json:"author"`
	Description string         `json:"description"`
	CoverUrl    string         `json:"coverUrl"`
	DownloadUrl string         `json:"downloadUrl"`
	SubjectID   *string        `gorm:"index;type:text;constraint:OnDelete:SET NULL" json:"subjectId"`
	Subject     *Subject       `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Price       float64        `gorm:"default:0" json:"price"`
	IsFree      bool           `gorm:"default:true" json:"isFree"`
	Rating      float64        `gorm:"default:0" json:"rating"`
	Views       int            `gorm:"default:0" json:"views"`
	Downloads   int            `gorm:"default:0" json:"downloads"`
	Tags        JSONStringArray `gorm:"type:jsonb" json:"tags"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (BlogPost) TableName() string { return "BlogPost" }
func (b *BlogPost) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" { b.ID = uuid.New().String() }
	return nil
}

func (ForumCategory) TableName() string { return "ForumCategory" }
func (f *ForumCategory) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" { f.ID = uuid.New().String() }
	return nil
}

func (ForumTopic) TableName() string { return "ForumTopic" }
func (f *ForumTopic) BeforeCreate(tx *gorm.DB) error {
	if f.ID == "" { f.ID = uuid.New().String() }
	return nil
}

func (LiveEvent) TableName() string { return "LiveEvent" }
func (le *LiveEvent) BeforeCreate(tx *gorm.DB) error {
	if le.ID == "" { le.ID = uuid.New().String() }
	return nil
}

func (Book) TableName() string { return "Book" }
func (b *Book) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" { b.ID = uuid.New().String() }
	return nil
}
