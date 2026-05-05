package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type CategoryType string

const (
	CategoryTypeCourse  CategoryType = "COURSE"
	CategoryTypeBlog    CategoryType = "BLOG"
	CategoryTypeLibrary CategoryType = "LIBRARY"
)

type Category struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Name        string         `gorm:"not null;column:name" json:"name"`
	Slug        string         `gorm:"uniqueIndex;not null;column:slug" json:"slug"`
	Type        CategoryType   `gorm:"default:'COURSE';column:type" json:"type"`
	Description *string        `gorm:"column:description" json:"description"`
	Icon        *string        `gorm:"column:icon" json:"icon"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

func (Category) TableName() string {
	return "Category"
}

func (c *Category) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return
}
