package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Contest struct {
	ID                string            `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title             string            `gorm:"not null;column:title" json:"title"`
	Description       *string           `gorm:"column:description" json:"description"`
	Category          *string           `gorm:"column:category" json:"category"`
	QuestionsCount    int               `gorm:"default:0;column:questions_count" json:"questionsCount"`
	ParticipantsCount int               `gorm:"default:0;column:participants_count" json:"participantsCount"`
	PinCode           *string           `gorm:"column:pin_code" json:"pinCode"`
	Status            string            `gorm:"default:'DRAFT';index;column:status" json:"status"`
	Questions         []ContestQuestion `gorm:"foreignKey:ContestID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
	CreatedAt         time.Time         `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt         time.Time         `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt         gorm.DeletedAt    `gorm:"index;column:deleted_at" json:"-"`
}

type ContestQuestion struct {
	ID            string `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	ContestID     string `gorm:"not null;index;type:uuid;column:contest_id" json:"contestId"`
	Question      string `gorm:"type:text;not null;column:question" json:"question"`
	CorrectAnswer string `gorm:"type:text;not null;column:correct_answer" json:"-"`
	Options       string `gorm:"type:text;not null;column:options" json:"options"`
	Duration      int    `gorm:"default:30;column:duration" json:"duration"`
	Points        int    `gorm:"default:10;column:points" json:"points"`
	Order         int    `gorm:"default:0;column:order" json:"order"`
}

func (Contest) TableName() string { return "Contest" }
func (c *Contest) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

func (ContestQuestion) TableName() string { return "ContestQuestion" }
func (cq *ContestQuestion) BeforeCreate(tx *gorm.DB) error {
	if cq.ID == "" {
		cq.ID = uuid.New().String()
	}
	return nil
}
