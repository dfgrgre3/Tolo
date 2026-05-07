package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Resource struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	SubjectID   string         `gorm:"not null;type:uuid;index;column:subject_id" json:"subjectId"`
	Title       string         `gorm:"not null;column:title" json:"title"`
	Description *string        `gorm:"column:description" json:"description"`
	URL         string         `gorm:"not null;column:url" json:"url"`
	Type        string         `gorm:"not null;default:'link';index;column:type" json:"type"`
	Source      *string        `gorm:"column:source" json:"source"`
	Free        bool           `gorm:"not null;default:true;index;column:free" json:"free"`
	CreatedAt   time.Time      `gorm:"index;column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	Subject Subject `gorm:"foreignKey:SubjectID;constraint:OnDelete:CASCADE" json:"subject,omitempty"`
}

func (Resource) TableName() string {
	return "Resource"
}

func (r *Resource) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
