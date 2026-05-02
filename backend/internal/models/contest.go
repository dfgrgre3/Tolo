package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Contest struct {
	ID                string            `gorm:"primaryKey;type:text" json:"id"`
	Title             string            `gorm:"not null" json:"title"`
	Description       *string           `json:"description"`
	Category          *string           `json:"category"`
	QuestionsCount    int               `gorm:"default:0" json:"questionsCount"`
	ParticipantsCount int               `gorm:"default:0" json:"participantsCount"`
	PinCode           *string           `json:"pinCode"`
	Status            string            `gorm:"default:'DRAFT';index" json:"status"` // DRAFT, WAITING, IN_PROGRESS, FINISHED
	Questions         []ContestQuestion `gorm:"foreignKey:ContestID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
	CreatedAt         time.Time         `json:"createdAt"`
	UpdatedAt         time.Time         `json:"updatedAt"`
	DeletedAt         gorm.DeletedAt    `gorm:"index" json:"-"`
}

type ContestQuestion struct {
	ID            string `gorm:"primaryKey;type:text" json:"id"`
	ContestID     string `gorm:"not null;index;type:text" json:"contestId"`
	Question      string `gorm:"type:text;not null" json:"question"`
	CorrectAnswer string `gorm:"type:text;not null" json:"-"` // Hidden from API
	Options       string `gorm:"type:text;not null" json:"options"` // JSON array string
	Duration      int    `gorm:"default:30" json:"duration"` // seconds
	Points        int    `gorm:"default:10" json:"points"`
	Order         int    `gorm:"default:0" json:"order"`
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