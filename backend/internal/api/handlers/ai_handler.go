package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"
	"thanawy-backend/internal/services"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	AIRequestTimeout   = 60 * time.Second
	MaxContextMessages = 20
	CacheTTL           = 24 * time.Hour
	MaxRetries         = 3
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

// AIExamProxy handles exam-related AI requests
func (h *AIHandler) AIExamProxy(c *gin.Context) {
	h.AIChatProxy(c)
}

// AISuggestProxy handles content suggestion requests
func (h *AIHandler) AISuggestProxy(c *gin.Context) {
	h.AIChatProxy(c)
}

// AITipsProxy handles study tips requests
func (h *AIHandler) AITipsProxy(c *gin.Context) {
	h.AIChatProxy(c)
}

// GetConversations returns all AI conversations for the user
func (h *AIHandler) GetConversations(c *gin.Context) {
	userID, _ := c.Get("userId")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	convs, total, err := h.conversationRepo.FindByUserID(userID.(string), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch conversations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"conversations": convs,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

// GetConversation returns a single AI conversation with messages
func (h *AIHandler) GetConversation(c *gin.Context) {
	id := c.Param("id")
	conv, err := h.conversationRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}
	messages, _ := h.conversationRepo.GetRecentMessages(id, 100)
	c.JSON(http.StatusOK, gin.H{"conversation": conv, "messages": messages})
}

// DeleteConversation removes an AI conversation
func (h *AIHandler) DeleteConversation(c *gin.Context) {
	id := c.Param("id")
	if err := h.conversationRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete conversation"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Conversation deleted"})
}

// ExplainMistakeProxy handles requests to explain an exam mistake
func (h *AIHandler) ExplainMistakeProxy(c *gin.Context) {
	h.AIChatProxy(c)
}

// GenerateStudyPlanProxy handles study plan generation
func (h *AIHandler) GenerateStudyPlanProxy(c *gin.Context) {
	h.AIChatProxy(c)
}

// SummarizeLessonProxy handles lesson summarization
func (h *AIHandler) SummarizeLessonProxy(c *gin.Context) {
	h.AIChatProxy(c)
}

// GradeEssayProxy handles essay grading requests
func (h *AIHandler) GradeEssayProxy(c *gin.Context) {
	h.AIChatProxy(c)
}

// Package-level wrappers
func AIChatProxy(c *gin.Context)            { GetAIHandler().AIChatProxy(c) }
func AIExamProxy(c *gin.Context)            { GetAIHandler().AIExamProxy(c) }
func AISuggestProxy(c *gin.Context)         { GetAIHandler().AISuggestProxy(c) }
func AITipsProxy(c *gin.Context)            { GetAIHandler().AITipsProxy(c) }
func GetConversations(c *gin.Context)       { GetAIHandler().GetConversations(c) }
func GetConversation(c *gin.Context)        { GetAIHandler().GetConversation(c) }
func DeleteConversation(c *gin.Context)     { GetAIHandler().DeleteConversation(c) }
func ExplainMistakeProxy(c *gin.Context)    { GetAIHandler().ExplainMistakeProxy(c) }
func GenerateStudyPlanProxy(c *gin.Context) { GetAIHandler().GenerateStudyPlanProxy(c) }
func SummarizeLessonProxy(c *gin.Context)   { GetAIHandler().SummarizeLessonProxy(c) }
func GradeEssayProxy(c *gin.Context)        { GetAIHandler().GradeEssayProxy(c) }

// Helper methods for AIHandler

func (h *AIHandler) getOrCreateConversation(userID, convID, subjectID, topicID string) (*models.AIConversation, error) {
	if convID != "" {
		conv, err := h.conversationRepo.FindByID(convID)
		if err == nil && conv.UserID == userID {
			return conv, nil
		}
	}

	// Create new conversation
	conv := &models.AIConversation{
		ID:        uuid.New().String(),
		UserID:    userID,
		Title:     "New Chat",
		CreatedAt: time.Now(),
	}
	if err := h.conversationRepo.Create(conv); err != nil {
		return nil, err
	}
	return conv, nil
}

func (h *AIHandler) buildAIMessages(c *gin.Context, userID string, history []models.AIMessage) []map[string]interface{} {
	messages := []map[string]interface{}{
		{"role": "system", "content": "You are a helpful educational assistant for the Thanawy platform."},
	}

	for _, m := range history {
		messages = append(messages, map[string]interface{}{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	return messages
}

// contentToString safely extracts a string from an interface{} that may be a string or an array
func contentToString(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	// If content is an array (e.g. vision messages), extract text parts
	if arr, ok := v.([]interface{}); ok {
		var parts []string
		for _, item := range arr {
			if m, ok := item.(map[string]interface{}); ok {
				if t, ok := m["type"].(string); ok && t == "text" {
					if text, ok := m["text"].(string); ok {
						parts = append(parts, text)
					}
				}
			}
		}
		return strings.Join(parts, " ")
	}
	return fmt.Sprintf("%v", v)
}

func (h *AIHandler) buildCacheKey(messages []map[string]interface{}) string {
	data, _ := json.Marshal(messages)
	return fmt.Sprintf("ai_cache:%x", data)
}

func (h *AIHandler) getCachedResponse(key string) string {
	if db.Redis == nil {
		return ""
	}
	val, err := db.Redis.Get(context.Background(), key).Result()
	if err == nil {
		return val
	}
	return ""
}

func (h *AIHandler) cacheResponse(key, response string) {
	if db.Redis == nil {
		return
	}
	db.Redis.Set(context.Background(), key, response, CacheTTL)
}

func (h *AIHandler) callAIWithRetryCustom(messages []map[string]interface{}, model string) (string, string, error) {
	var lastErr error
	for i := 0; i < MaxRetries; i++ {
		reply, err := h.aiService.GenerateContentWithMessages(context.Background(), messages, model)
		if err == nil {
			return reply, model, nil
		}
		lastErr = err
		time.Sleep(time.Duration(rand.Intn(1000)) * time.Millisecond)
	}
	return "", "", lastErr
}

func (h *AIHandler) handleStreamingChat(c *gin.Context, messages []map[string]interface{}, convID, cacheKey, model string) {
	// Simple non-streaming fallback for now
	reply, usedModel, err := h.callAIWithRetryCustom(messages, model)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	assistantMessage := &models.AIMessage{
		ConversationID: convID,
		Role:           "assistant",
		Content:        reply,
		Model:          stringPtr(usedModel),
	}
	h.conversationRepo.AddMessage(assistantMessage)

	c.JSON(http.StatusOK, ChatResponse{
		Reply:          reply,
		ConversationID: convID,
		MessageID:      assistantMessage.ID,
	})
}

func isValidBase64Image(s string) bool {
	if !strings.HasPrefix(s, "data:image/") {
		return false
	}
	return true // Basic check
}

func stringPtr(s string) *string {
	return &s
}
