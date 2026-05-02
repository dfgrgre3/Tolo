package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type CategoryType string

const (
	CategoryTypeCourse CategoryType = "COURSE"
	CategoryTypeBlog   CategoryType = "BLOG"
	CategoryTypeLibrary CategoryType = "LIBRARY"
)

type Category struct {
	ID          string       `gorm:"primaryKey" json:"id"`
	Name        string       `gorm:"not null" json:"name"`
	Slug        string       `gorm:"uniqueIndex;not null" json:"slug"`
	Type        CategoryType `gorm:"default:'COURSE'" json:"type"`
	Description *string      `json:"description"`
	Icon        *string      `json:"icon"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
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
