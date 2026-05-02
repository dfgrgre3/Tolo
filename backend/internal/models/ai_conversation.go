package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AIConversation represents a chat conversation with the AI
type AIConversation struct {
	ID        string    `gorm:"primaryKey;type:text" json:"id"`
	UserID    string    `gorm:"not null;type:text;index" json:"userId"`
	SubjectID *string   `gorm:"type:text;index" json:"subjectId,omitempty"`
	TopicID   *string   `gorm:"type:text;index" json:"topicId,omitempty"`
	Title     string    `gorm:"type:text" json:"title"`
	Messages  []AIMessage `gorm:"foreignKey:ConversationID;constraint:OnDelete:CASCADE" json:"messages,omitempty"`
	IsActive  bool      `gorm:"default:true;index" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// AIMessage represents a single message in a conversation
type AIMessage struct {
	ID             string    `gorm:"primaryKey;type:text" json:"id"`
	ConversationID string    `gorm:"not null;type:text;index" json:"conversationId"`
	Role           string    `gorm:"not null;type:text" json:"role"` // "user" or "assistant"
	Content        string    `gorm:"not null;type:text" json:"content"`
	Model          *string   `gorm:"type:text" json:"model,omitempty"`
	TokensUsed     *int      `gorm:"type:integer" json:"tokensUsed,omitempty"`
	Latency        *int64    `gorm:"type:bigint" json:"latency,omitempty"` // in milliseconds
	CreatedAt      time.Time `json:"createdAt"`
}

// TableName sets the table name for AIConversation
func (AIConversation) TableName() string {
	return "AIConversation"
}

// TableName sets the table name for AIMessage
func (AIMessage) TableName() string {
	return "AIMessage"
}

// BeforeCreate generates UUIDs for new records
func (c *AIConversation) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return
}

func (m *AIMessage) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return
}

// AIConversationRepository defines the interface for conversation storage operations
type AIConversationRepository interface {
	Create(conversation *AIConversation) error
	FindByID(id string) (*AIConversation, error)
	FindByUserID(userID string, limit, offset int) ([]AIConversation, int64, error)
	Update(conversation *AIConversation) error
	Delete(id string) error
	AddMessage(message *AIMessage) error
	GetMessages(conversationID string, limit int) ([]AIMessage, error)
	GetRecentMessages(conversationID string, count int) ([]AIMessage, error)
	DeleteOldConversations(olderThan time.Duration) error
}
