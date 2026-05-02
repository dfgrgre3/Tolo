package repository

import (
	"time"

	"thanawy-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AIConversationRepo implements AIConversationRepository
type AIConversationRepo struct {
	db *gorm.DB
}

// NewAIConversationRepo creates a new AI conversation repository
func NewAIConversationRepo(db *gorm.DB) models.AIConversationRepository {
	return &AIConversationRepo{db: db}
}

// Create creates a new conversation
func (r *AIConversationRepo) Create(conversation *models.AIConversation) error {
	if conversation.ID == "" {
		conversation.ID = uuid.New().String()
	}
	return r.db.Create(conversation).Error
}

// FindByID finds a conversation by ID with its messages
func (r *AIConversationRepo) FindByID(id string) (*models.AIConversation, error) {
	var conversation models.AIConversation
	err := r.db.Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("\"createdAt\" ASC")
	}).First(&conversation, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &conversation, nil
}

// FindByUserID finds conversations by user ID with pagination
func (r *AIConversationRepo) FindByUserID(userID string, limit, offset int) ([]models.AIConversation, int64, error) {
	var conversations []models.AIConversation
	var count int64

	// Count total
	if err := r.db.Model(&models.AIConversation{}).Where("\"userId\" = ? AND \"isActive\" = ?", userID, true).Count(&count).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := r.db.Where("\"userId\" = ? AND \"isActive\" = ?", userID, true).
		Order("\"updatedAt\" DESC").
		Limit(limit).
		Offset(offset).
		Find(&conversations).Error
	if err != nil {
		return nil, 0, err
	}

	return conversations, count, nil
}

// Update updates a conversation
func (r *AIConversationRepo) Update(conversation *models.AIConversation) error {
	return r.db.Save(conversation).Error
}

// Delete soft-deletes a conversation (sets isActive to false)
func (r *AIConversationRepo) Delete(id string) error {
	return r.db.Model(&models.AIConversation{}).Where("id = ?", id).Update("isActive", false).Error
}

// AddMessage adds a message to a conversation
func (r *AIConversationRepo) AddMessage(message *models.AIMessage) error {
	if message.ID == "" {
		message.ID = uuid.New().String()
	}
	
	// Use transaction to add message and update conversation timestamp
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(message).Error; err != nil {
			return err
		}
		// Update conversation's updatedAt
		return tx.Model(&models.AIConversation{}).Where("id = ?", message.ConversationID).Update("updatedAt", time.Now()).Error
	})
}

// GetMessages gets messages for a conversation with limit
func (r *AIConversationRepo) GetMessages(conversationID string, limit int) ([]models.AIMessage, error) {
	var messages []models.AIMessage
	
	query := r.db.Where("\"conversationId\" = ?", conversationID).Order("\"createdAt\" ASC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&messages).Error
	if err != nil {
		return nil, err
	}
	
	return messages, nil
}

// DeleteOldConversations deletes conversations older than the specified duration
func (r *AIConversationRepo) DeleteOldConversations(olderThan time.Duration) error {
	cutoffTime := time.Now().Add(-olderThan)
	return r.db.Model(&models.AIConversation{}).Where("\"updatedAt\" < ?", cutoffTime).Update("isActive", false).Error
}

// GetRecentMessages gets the most recent messages for context (last N messages)
func (r *AIConversationRepo) GetRecentMessages(conversationID string, count int) ([]models.AIMessage, error) {
	var messages []models.AIMessage
	
	err := r.db.Where("\"conversationId\" = ?", conversationID).
		Order("\"createdAt\" DESC").
		Limit(count).
		Find(&messages).Error
	if err != nil {
		return nil, err
	}
	
	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}
	
	return messages, nil
}