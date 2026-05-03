package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AIConversation represents a chat conversation with the AI
type AIConversation struct {
	ID        string    `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID    string    `gorm:"not null;type:uuid;index;column:user_id" json:"userId"`
	SubjectID *string   `gorm:"type:uuid;index;column:subject_id" json:"subjectId,omitempty"`
	TopicID   *string   `gorm:"type:uuid;index;column:topic_id" json:"topicId,omitempty"`
	Title     string    `gorm:"type:text;column:title" json:"title"`
	Messages  []AIMessage `gorm:"foreignKey:ConversationID;constraint:OnDelete:CASCADE" json:"messages,omitempty"`
	IsActive  bool      `gorm:"default:true;index;column:is_active" json:"isActive"`
	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

// AIMessage represents a single message in a conversation
type AIMessage struct {
	ID             string    `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	ConversationID string    `gorm:"not null;type:uuid;index;column:conversation_id" json:"conversationId"`
	Role           string    `gorm:"not null;type:text;column:role" json:"role"` // "user" or "assistant"
	Content        string    `gorm:"not null;type:text;column:content" json:"content"`
	Model          *string   `gorm:"type:text;column:model" json:"model,omitempty"`
	TokensUsed     *int      `gorm:"type:integer;column:tokens_used" json:"tokensUsed,omitempty"`
	Latency        *int64    `gorm:"type:bigint;column:latency" json:"latency,omitempty"` // in milliseconds
	CreatedAt      time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updatedAt"`
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
