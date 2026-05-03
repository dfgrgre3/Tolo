package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	AIRequestTimeout   = 60 * time.Second
	MaxContextMessages = 20
	CacheTTL         = 24 * time.Hour
	MaxRetries       = 3
)

type AIHandler struct {
	conversationRepo models.AIConversationRepository
	aiService        *services.AIService
}

var (
	sharedAIHandler *AIHandler
	aiHandlerOnce   sync.Once
)

func GetAIHandler() *AIHandler {
	aiHandlerOnce.Do(func() {
		sharedAIHandler = &AIHandler{
			conversationRepo: repository.NewAIConversationRepo(db.DB),
			aiService:        services.GetAIService(),
		}
	})
	return sharedAIHandler
}

func NewAIHandler() *AIHandler {
	return GetAIHandler()
}

type ChatRequest struct {
	Message        string `json:"message"`
	ConversationID string `json:"conversationId,omitempty"`
	SubjectID      string `json:"subjectId,omitempty"`
	TopicID        string `json:"topicId,omitempty"`
	Stream         bool   `json:"stream,omitempty"`
	Model          string `json:"model,omitempty"`
	Image          string `json:"image,omitempty"` // Base64 encoded image
}

type ChatResponse struct {
	Reply          string `json:"reply"`
	ConversationID string `json:"conversationId"`
	MessageID      string `json:"messageId"`
}

// AIChatProxy handles chat requests with conversation history (new version)
func (h *AIHandler) AIChatProxy(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate message length (max 2000 chars)
	if req.Message != "" {
		if len([]rune(req.Message)) > 2000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Message exceeds maximum length of 2000 characters"})
			return
		}
		// Check for empty message after trimming
		if strings.TrimSpace(req.Message) == "" && req.Image == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Message cannot be empty"})
			return
		}
	}

	// Validate image (if provided)
	if req.Image != "" {
		// Check if it's a valid base64 string and reasonable size
		if len(req.Image) > 5*1024*1024 { // 5MB limit for base64
			c.JSON(http.StatusBadRequest, gin.H{"error": "Image size exceeds 5MB limit"})
			return
		}
		// Basic base64 validation
		if !isValidBase64Image(req.Image) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image format"})
			return
		}
	}

	if req.Message == "" && req.Image == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message or image is required"})
		return
	}

	// Validate conversation ID format if provided
	if req.ConversationID != "" {
		if len(req.ConversationID) > 100 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation ID"})
			return
		}
	}

	// Get user ID from context safely
	userIDValue, exists := c.Get("userId")
	if !exists || userIDValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required to use AI features"})
		return
	}
	userIDStr, ok := userIDValue.(string)
	if !ok || userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user session"})
		return
	}

	// Get or create conversation
	conversation, err := h.getOrCreateConversation(userIDStr, req.ConversationID, req.SubjectID, req.TopicID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to manage conversation"})
		return
	}

	// Build user message content for AI
	var userContent interface{}
	userMessageText := req.Message
	if req.Image != "" {
		if userMessageText == "" {
			userMessageText = "[صورة]"
		}
		userContent = []map[string]interface{}{
			{"type": "text", "text": req.Message},
			{"type": "image_url", "image_url": map[string]string{"url": req.Image}},
		}
	} else {
		userContent = req.Message
	}

	// Save user message to DB
	userMessage := &models.AIMessage{
		ConversationID: conversation.ID,
		Role:           "user",
		Content:        userMessageText,
	}
	if err := h.conversationRepo.AddMessage(userMessage); err != nil {
		log.Printf("Failed to save user message: %v", err)
	}

	// Get conversation history
	messages, err := h.conversationRepo.GetRecentMessages(conversation.ID, MaxContextMessages)
	if err != nil {
		messages = []models.AIMessage{}
	}

	// Build messages for AI API
	aiMessages := h.buildAIMessages(c, userIDStr, messages)
	
	// If it's a vision request, we need to modify the last message
	if req.Image != "" {
		aiMessages[len(aiMessages)-1]["content"] = userContent
	}

	// Check cache (only for text-only requests)
	var cacheKey string
	if req.Image == "" {
		cacheKey = h.buildCacheKey(aiMessages)
		if cachedResponse := h.getCachedResponse(cacheKey); cachedResponse != "" {
			assistantMessage := &models.AIMessage{
				ConversationID: conversation.ID,
				Role:           "assistant",
				Content:        cachedResponse,
				Model:          stringPtr("cached"),
			}
			h.conversationRepo.AddMessage(assistantMessage)
			c.JSON(http.StatusOK, ChatResponse{
				Reply:          cachedResponse,
				ConversationID: conversation.ID,
				MessageID:      assistantMessage.ID,
			})
			return
		}
	}

	// Select model based on input
	model := "google/gemini-2.0-flash-001" // Default fast model
	if req.Image != "" {
		model = "google/gemini-pro-1.5" // Better vision support
	}

	// Handle streaming request
	if req.Stream {
		h.handleStreamingChat(c, aiMessages, conversation.ID, cacheKey, model)
		return
	}

	// Call AI
	reply, usedModel, err := h.callAIWithRetryCustom(aiMessages, model)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get AI response", "details": err.Error()})
		return
	}

	// Save assistant message
	assistantMessage := &models.AIMessage{
		ConversationID: conversation.ID,
		Role:           "assistant",
		Content:        reply,
		Model:          stringPtr(usedModel),
	}
	h.conversationRepo.AddMessage(assistantMessage)

	if cacheKey != "" {
		h.cacheResponse(cacheKey, reply)
	}

	// Deduct credits (vision costs more)
	if userIDStr != "" {
		credits := 1
		if req.Image != "" {
			credits = 5
		}
		db.DB.Model(&models.User{}).Where("id = ?", userIDStr).UpdateColumn("aiCredits", gorm.Expr("GREATEST(0, \"aiCredits\" - ?)", credits))
	}

	c.JSON(http.StatusOK, ChatResponse{
		Reply:          reply,
		ConversationID: conversation.ID,
		MessageID:      assistantMessage.ID,
	})
}
