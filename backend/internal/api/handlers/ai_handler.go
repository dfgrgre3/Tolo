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
}

func NewAIHandler() *AIHandler {
	return &AIHandler{
		conversationRepo: repository.NewAIConversationRepo(db.DB),
	}
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

	if req.Message == "" && req.Image == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message or image is required"})
		return
	}

	// Get user ID from context
	userID, _ := c.Get("userId")
	userIDStr := ""
	if userID != nil {
		userIDStr = fmt.Sprintf("%v", userID)
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
		h.handleStreamingChat(c, aiMessages, conversation.ID, cacheKey)
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

// handleStreamingChat handles SSE streaming responses
func (h *AIHandler) handleStreamingChat(c *gin.Context, messages []map[string]interface{}, conversationID, cacheKey string) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusOK, gin.H{"reply": "مساعد ذكي (وضع عدم الاتصال). كيف يمكنني مساعدتك؟"})
		return
	}

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	// Build payload
	payload := map[string]interface{}{
		"model":    "openai/gpt-oss-120b:free",
		"messages": messages,
		"stream":   true,
		"temperature": 0.7,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		h.sendSSEError(c, "Failed to prepare request")
		return
	}

	// Create request with context
	ctx, cancel := context.WithTimeout(c.Request.Context(), AIRequestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		h.sendSSEError(c, "Failed to create request")
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("HTTP-Referer", "https://thanawy.com")
	req.Header.Set("X-Title", "Thanawy Platform")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		h.sendSSEError(c, "Failed to connect to AI service")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		h.sendSSEError(c, fmt.Sprintf("AI service error: %s", string(body)))
		return
	}

	// Read streaming response
	fullResponse := ""
	buffer := make([]byte, 1024)
	
	for {
		n, err := resp.Body.Read(buffer)
		if n > 0 {
			chunk := buffer[:n]
			lines := strings.Split(string(chunk), "\n")
			
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if !strings.HasPrefix(line, "data: ") {
					continue
				}
				
				data := strings.TrimPrefix(line, "data: ")
				if data == "[DONE]" {
					// Save complete message to DB
					assistantMessage := &models.AIMessage{
						ConversationID: conversationID,
						Role:           "assistant",
						Content:        fullResponse,
						Model:          stringPtr("openai/gpt-oss-120b:free"),
					}
					h.conversationRepo.AddMessage(assistantMessage)
					
					// Cache the full response
					h.cacheResponse(cacheKey, fullResponse)
					
					// Send done event
					fmt.Fprintf(c.Writer, "data: {\"done\": true, \"conversationId\": \"%s\"}\n\n", conversationID)
					c.Writer.Flush()
					return
				}

				var streamResp struct {
					Choices []struct {
						Delta struct {
							Content string `json:"content"`
						} `json:"delta"`
					} `json:"choices"`
				}

				if err := json.Unmarshal([]byte(data), &streamResp); err == nil {
					if len(streamResp.Choices) > 0 && streamResp.Choices[0].Delta.Content != "" {
						content := streamResp.Choices[0].Delta.Content
						fullResponse += content
						
						// Send SSE event
						escaped := strings.ReplaceAll(content, "\n", "\\n")
						fmt.Fprintf(c.Writer, "data: {\"content\": \"%s\"}\n\n", escaped)
						c.Writer.Flush()
					}
				}
			}
		}
		
		if err != nil {
			break
		}
	}
}

// sendSSEError sends an error event in SSE format
func (h *AIHandler) sendSSEError(c *gin.Context, errMsg string) {
	fmt.Fprintf(c.Writer, "data: {\"error\": \"%s\"}\n\n", errMsg)
	c.Writer.Flush()
}

// getOrCreateConversation gets existing or creates new conversation with context
func (h *AIHandler) getOrCreateConversation(userID, conversationID, subjectID, topicID string) (*models.AIConversation, error) {
	if conversationID != "" {
		conv, err := h.conversationRepo.FindByID(conversationID)
		if err == nil {
			return conv, nil
		}
	}

	// Create new conversation
	conversation := &models.AIConversation{
		UserID: userID,
		Title:  "محادثة جديدة",
		IsActive: true,
	}

	if subjectID != "" {
		conversation.SubjectID = &subjectID
	}
	if topicID != "" {
		conversation.TopicID = &topicID
	}
	
	if err := h.conversationRepo.Create(conversation); err != nil {
		return nil, err
	}
	
	return conversation, nil
}

// buildAIMessages builds the messages array for the AI API
func (h *AIHandler) buildAIMessages(c *gin.Context, userID string, history []models.AIMessage) []map[string]interface{} {
	messages := []map[string]interface{}{}
	
	// Add system prompt
	systemPrompt := h.buildSystemPrompt(c, userID)
	messages = append(messages, map[string]interface{}{
		"role":    "system",
		"content": systemPrompt,
	})
	
	// Add history (excluding system messages)
	for _, msg := range history {
		if msg.Role == "system" {
			continue
		}
		messages = append(messages, map[string]interface{}{
			"role":    msg.Role,
			"content": msg.Content,
		})
	}
	
	return messages
}

// buildSystemPrompt builds a personalized system prompt
func (h *AIHandler) buildSystemPrompt(c *gin.Context, userID string) string {
	basePrompt := `أنت مساعد ذكي ومتخصص في مساعدة طلاب الثانوية العامة في مصر.
اجيب بطريقة واضحة ومفيدة ومنظمة. استخدم اللغة العربية الفصحى البسيطة والودودة.`

	if userID != "" {
		// Fetch student context
		var user models.User
		if err := db.DB.Preload("Enrollments.Subject").First(&user, "id = ?", userID).Error; err == nil {
			subjects := []string{}
			for _, e := range user.Enrollments {
				if e.Subject.ID != "" && e.Subject.NameAr != nil {
					subjects = append(subjects, *e.Subject.NameAr)
				} else if e.Subject.ID != "" {
					subjects = append(subjects, e.Subject.Name)
				}
			}
			if len(subjects) > 0 {
				basePrompt += fmt.Sprintf("\nالطالب مشترك في المواد التالية: %s.", strings.Join(subjects, "، "))
			}

			// Fetch recent exam results
			var results []models.ExamResult
			if err := db.DB.Preload("Exam").Where("user_id = ?", userID).Order("taken_at desc").Limit(3).Find(&results).Error; err == nil && len(results) > 0 {
				basePrompt += "\nنتائج الامتحانات الأخيرة:"
				for _, r := range results {
					basePrompt += fmt.Sprintf("\n- %s: %v/%v", r.Exam.Title, r.Score, r.Exam.MaxScore)
				}
			}

			// Fetch pending tasks
			var taskCount int64
			db.DB.Model(&models.Task{}).Where("user_id = ? AND status = ?", userID, "PENDING").Count(&taskCount)
			if taskCount > 0 {
				basePrompt += fmt.Sprintf("\nلدى الطالب %d مهام دراسية معلقة.", taskCount)
			}
		}
	}

	// Check for conversation context if available
	if convID := c.Query("conversationId"); convID != "" {
		conv, err := h.conversationRepo.FindByID(convID)
		if err == nil {
			if conv.SubjectID != nil {
				var subj models.Subject
				if db.DB.First(&subj, "id = ?", *conv.SubjectID).Error == nil {
					name := subj.Name
					if subj.NameAr != nil {
						name = *subj.NameAr
					}
					basePrompt += fmt.Sprintf("\nسياق الطالب الحالي: يذاكر مادة %s.", name)
				}
			}
			if conv.TopicID != nil {
				basePrompt += fmt.Sprintf("\nالدرس الحالي: %s.", *conv.TopicID)
			}
		}
	}

	return basePrompt
}

// callAIWithRetryCustom calls AI with a specific model and retry logic
func (h *AIHandler) callAIWithRetryCustom(messages []map[string]interface{}, model string) (string, string, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return "أنا مساعدك الذكي Tolo AI. كيف يمكنني مساعدتك اليوم؟", "mock", nil
	}

	var lastErr error
	for attempt := 0; attempt <= MaxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
		reply, err := h.callAI(apiKey, model, messages)
		if err == nil {
			return reply, model, nil
		}
		lastErr = err
	}
	return "", "", lastErr
}

// callAI makes the actual API call
func (h *AIHandler) callAI(apiKey, model string, messages []map[string]interface{}) (string, error) {
	payload := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"max_tokens":  1500,
		"temperature": 0.7,
	}
	
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	
	req, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("HTTP-Referer", "https://thanawy.com")
	req.Header.Set("X-Title", "Thanawy Platform")
	
	client := &http.Client{Timeout: AIRequestTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("AI service error: %s", string(body))
	}
	
	var aiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	
	if err := json.Unmarshal(body, &aiResp); err != nil {
		return "", err
	}
	
	if len(aiResp.Choices) == 0 {
		return "", fmt.Errorf("empty response from AI")
	}
	
	return aiResp.Choices[0].Message.Content, nil
}

// buildCacheKey creates a hash key for caching
func (h *AIHandler) buildCacheKey(messages []map[string]interface{}) string {
	data, _ := json.Marshal(messages)
	return fmt.Sprintf("ai_cache:%x", data)
}

// getCachedResponse gets cached response from Redis
func (h *AIHandler) getCachedResponse(key string) string {
	if db.Redis == nil {
		return ""
	}
	
	ctx := context.Background()
	val, err := db.Redis.Get(ctx, key).Result()
	if err != nil {
		return ""
	}
	return val
}

// cacheResponse caches response in Redis
func (h *AIHandler) cacheResponse(key, response string) {
	if db.Redis == nil {
		return
	}
	
	ctx := context.Background()
	db.Redis.Set(ctx, key, response, CacheTTL)
}

// GetConversations returns user's conversations
func (h *AIHandler) GetConversations(c *gin.Context) {
	userID, _ := c.Get("userId")
	if userID == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	limit := 20
	offset := 0
	
	conversations, total, err := h.conversationRepo.FindByUserID(fmt.Sprintf("%v", userID), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversations"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"conversations": conversations,
		"total":         total,
	})
}

// GetConversation returns a single conversation with messages
func (h *AIHandler) GetConversation(c *gin.Context) {
	conversationID := c.Param("id")
	
	conversation, err := h.conversationRepo.FindByID(conversationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}
	
	// Check authorization
	userID, _ := c.Get("userId")
	if userID != nil && conversation.UserID != fmt.Sprintf("%v", userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}
	
	c.JSON(http.StatusOK, conversation)
}

// DeleteConversation soft-deletes a conversation
func (h *AIHandler) DeleteConversation(c *gin.Context) {
	conversationID := c.Param("id")
	
	// Check authorization
	conversation, err := h.conversationRepo.FindByID(conversationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}
	
	userID, _ := c.Get("userId")
	if userID == nil || conversation.UserID != fmt.Sprintf("%v", userID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}
	
	if err := h.conversationRepo.Delete(conversationID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete conversation"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Helper to get string pointer
func stringPtr(s string) *string {
	return &s
}

// callAIWithRetryStandalone calls AI with retry logic (standalone version for exam generation)
func callAIWithRetryStandalone(messages []map[string]string) (string, string, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	model := "openai/gpt-oss-120b:free"
	
	if apiKey == "" {
		return "", "mock", fmt.Errorf("no API key configured")
	}

	var lastErr error
	
	for attempt := 0; attempt <= MaxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff
			backoff := time.Duration(1<<uint(attempt-1)) * time.Second
			if backoff > 30*time.Second {
				backoff = 30 * time.Second
			}
			time.Sleep(backoff + time.Duration(rand.Intn(1000))*time.Millisecond)
		}
		
		reply, err := callAIStandalone(apiKey, model, messages)
		if err == nil {
			return reply, model, nil
		}
		lastErr = err
		log.Printf("AI request attempt %d failed: %v", attempt+1, err)
	}
	
	return "", "", fmt.Errorf("failed after %d retries: %w", MaxRetries, lastErr)
}

// callAIStandalone makes the actual API call (standalone version)
func callAIStandalone(apiKey, model string, messages []map[string]string) (string, error) {
	payload := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"max_tokens":  2000,
		"temperature": 0.7,
	}
	
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), AIRequestTimeout)
	defer cancel()
	
	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("HTTP-Referer", "https://thanawy.com")
	req.Header.Set("X-Title", "Thanawy Platform")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call AI service: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}
	
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("AI service error (status %d): %s", resp.StatusCode, string(body))
	}
	
	var aiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	
	if err := json.Unmarshal(body, &aiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}
	
	if len(aiResp.Choices) == 0 || aiResp.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("empty response from AI")
	}
	
	return aiResp.Choices[0].Message.Content, nil
}

// AIExamProxy handles exam generation requests and saves them to DB
func (h *AIHandler) AIExamProxy(c *gin.Context) {
	var req struct {
		SubjectID     string `json:"subjectId"` // Use ID for DB linking
		SubjectName   string `json:"subject"`
		Year          string `json:"year"`
		Lesson        string `json:"lesson"`
		QuestionCount int    `json:"questionCount"`
		Difficulty    string `json:"difficulty,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID
	userID, _ := c.Get("userId")
	userIDStr := ""
	if userID != nil {
		userIDStr = fmt.Sprintf("%v", userID)
	}

	// Validate required fields
	if req.SubjectName == "" || req.Year == "" || req.Lesson == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Subject, year, and lesson are required"})
		return
	}

	if req.QuestionCount < 1 || req.QuestionCount > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Question count must be between 1 and 50"})
		return
	}

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	var questions []map[string]interface{}
	var examID string

	if apiKey == "" {
		// Fallback to mock if no API key
		log.Println("[AI Exam] No API key found, using mock data")
		mockQs := generateMockQuestions(req.SubjectName, req.Lesson, req.QuestionCount)
		for _, q := range mockQs {
			questions = append(questions, q)
		}
		examID = "mock-" + uuid.NewString()
	} else {
		// Build prompt for AI
		prompt := fmt.Sprintf(`Generate %d multiple choice questions for %s - %s (Lesson: %s). 
Return ONLY a valid JSON array with objects containing these exact fields:
- question: string (the question text in Arabic)
- type: string (always "multiple_choice")
- options: array of 4 strings (possible answers in Arabic)
- correctAnswer: string (the correct answer from options)
- explanation: string (explanation in Arabic why this answer is correct)

Example format:
[
  {
    "question": "ما هي عاصمة مصر؟",
    "type": "multiple_choice",
    "options": ["القاهرة", "الإسكندرية", "الجيزة", "الأقصر"],
    "correctAnswer": "القاهرة",
    "explanation": "القاهرة هي العاصمة التاريخية والحالية لجمهورية مصر العربية."
  }
]`, req.QuestionCount, req.SubjectName, req.Year, req.Lesson)

		messages := []map[string]string{
			{"role": "system", "content": "You are an expert educational content creator specializing in creating high-quality exam questions for Egyptian secondary education students. Always respond with valid JSON only."},
			{"role": "user", "content": prompt},
		}

		// Call AI with retry logic
		reply, _, err := callAIWithRetryStandalone(messages)
		if err != nil {
			log.Printf("[AI Exam] Failed to generate exam: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate exam questions"})
			return
		}

		// Parse the AI response
		if err := json.Unmarshal([]byte(reply), &questions); err != nil {
			log.Printf("[AI Exam] Failed to parse AI response: %v", err)
			mockQs := generateMockQuestions(req.SubjectName, req.Lesson, req.QuestionCount)
			for _, q := range mockQs {
				questions = append(questions, q)
			}
			examID = "fallback-" + uuid.NewString()
		}
	}

	// SAVE TO DATABASE if we have a SubjectID
	if req.SubjectID != "" {
		exam := models.Exam{
			ID:        uuid.New().String(),
			SubjectID: req.SubjectID,
			Title:     fmt.Sprintf("امتحان ذكي: %s - %s", req.SubjectName, req.Lesson),
			Type:      models.ExamTypeQuiz,
			Duration:  req.QuestionCount * 2, // 2 mins per question
		}

		if err := db.DB.Create(&exam).Error; err == nil {
			examID = exam.ID
			// Save questions
			for _, q := range questions {
				optionsJSON, _ := json.Marshal(q["options"])
				question := models.Question{
					ExamID:  exam.ID,
					Text:    q["question"].(string),
					Type:    "MCQ",
					Options: string(optionsJSON),
					Answer:  q["correctAnswer"].(string),
				}
				db.DB.Create(&question)
			}
		}
	}

	// Deduct AI credits for exam generation (costs 5 credits)
	if userIDStr != "" {
		db.DB.Model(&models.User{}).Where("id = ?", userIDStr).UpdateColumn("aiCredits", gorm.Expr("GREATEST(0, \"aiCredits\" - 5)"))
	}

	c.JSON(http.StatusOK, gin.H{
		"examId":    examID,
		"questions": questions,
	})
}

// generateMockQuestions generates mock exam questions when AI is unavailable
func generateMockQuestions(subject, lesson string, count int) []gin.H {
	questions := make([]gin.H, count)
	
	// Sample question templates based on subject
	for i := 0; i < count; i++ {
		questionNum := i + 1
		
		switch strings.ToLower(subject) {
		case "math", "رياضيات":
			questions[i] = gin.H{
				"question":      fmt.Sprintf("السؤال %d: ما هو ناتج العملية الحسابية في درس %s؟", questionNum, lesson),
				"type":          "multiple_choice",
				"options":       []string{"الإجابة أ", "الإجابة ب", "الإجابة ج", "الإجابة د"},
				"correctAnswer": "الإجابة أ",
				"explanation":   fmt.Sprintf("هذه الإجابة صحيحة لأنها تتبع القواعد الرياضية الأساسية."),
			}
		case "physics", "فيزياء":
			questions[i] = gin.H{
				"question":      fmt.Sprintf("السؤال %d: أي من القوانين التالية ينطبق على %s؟", questionNum, lesson),
				"type":          "multiple_choice",
				"options":       []string{"قانون نيوتن الأول", "قانون نيوتن الثاني", "قانون نيوتن الثالث", "قانون الجاذبية"},
				"correctAnswer": "قانون نيوتن الأول",
				"explanation":   fmt.Sprintf("ينطبق هذا القانون لأن الجسم يبقى في حالة سكون أو حركة منتظمة ما لم تؤثر عليه قوة خارجية."),
			}
		case "chemistry", "كيمياء":
			questions[i] = gin.H{
				"question":      fmt.Sprintf("السؤال %d: ما هو العنصر الكيميائي الرئيسي في %s؟", questionNum, lesson),
				"type":          "multiple_choice",
				"options":       []string{"الهيدروجين", "الأكسجين", "الكربون", "النيتروجين"},
				"correctAnswer": "الكربون",
				"explanation":   fmt.Sprintf("الكربون هو العنصر الأساسي في المركبات العضوية."),
			}
		default:
			questions[i] = gin.H{
				"question":      fmt.Sprintf("السؤال %d: سؤال عن %s في مادة %s", questionNum, lesson, subject),
				"type":          "multiple_choice",
				"options":       []string{"الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"},
				"correctAnswer": "الخيار الأول",
				"explanation":   fmt.Sprintf("هذا هو الخيار الصحيح لأنه يتوافق مع المفهوم الأساسي."),
			}
		}
	}
	
	return questions
}

func AIChatProxy(c *gin.Context) {
	handler := NewAIHandler()
	handler.AIChatProxy(c)
}

func AIExamProxy(c *gin.Context) {
	handler := NewAIHandler()
	handler.AIExamProxy(c)
}

func AISuggestProxy(c *gin.Context) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusOK, gin.H{
			"suggestions": []string{
				"ابدأ بمراجعة الوحدة الأولى من مادة الفيزياء",
				"قم بحل امتحان تجريبي لمادة اللغة العربية",
			},
		})
		return
	}
	// Placeholder - implement actual suggestion logic
	c.JSON(http.StatusOK, gin.H{"suggestions": []string{}})
}

func AITipsProxy(c *gin.Context) {
	// TODO: Implement tips logic or return mock data
	c.JSON(http.StatusOK, gin.H{
		"tips": []string{
			"راجع الدروس بانتظام",
			"حل الامتحانات السابقة",
			"استخدم الخرائط الذهنية للمذاكرة",
		},
	})
}

func GetConversations(c *gin.Context) {
	handler := NewAIHandler()
	handler.GetConversations(c)
}

func GetConversation(c *gin.Context) {
	handler := NewAIHandler()
	handler.GetConversation(c)
}

func DeleteConversation(c *gin.Context) {
	handler := NewAIHandler()
	handler.DeleteConversation(c)
}

// ExplainMistake analyzes a wrong answer and explains it
func (h *AIHandler) ExplainMistake(c *gin.Context) {
	var req struct {
		QuestionID string `json:"questionId"`
		UserAnswer string `json:"userAnswer"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var question models.Question
	if err := db.DB.First(&question, "id = ?", req.QuestionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
		return
	}

	prompt := fmt.Sprintf(`بصفتك مدرس خبير، اشرح للطالب لماذا إجابته خاطئة وكيف يصل للحل الصحيح.
السؤال: %s
إجابة الطالب: %s
الإجابة الصحيحة: %s
اشرح المفهوم العلمي وراء السؤال ببساطة باللغة العربية.`, question.Text, req.UserAnswer, question.Answer)

	messages := []map[string]interface{}{
		{"role": "system", "content": "أنت مدرس مصري خبير تشرح المفاهيم صعبة للطلاب بطريقة مبسطة ومشجعة."},
		{"role": "user", "content": prompt},
	}

	reply, _, err := h.callAIWithRetryCustom(messages, "google/gemini-2.0-flash-001")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get explanation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"explanation": reply})
}

func ExplainMistakeProxy(c *gin.Context) {
	handler := NewAIHandler()
	handler.ExplainMistake(c)
}

// GenerateStudyPlan creates a personalized study schedule
func (h *AIHandler) GenerateStudyPlan(c *gin.Context) {
	var req struct {
		ExamDate    string `json:"examDate"`
		TargetGrade string `json:"targetGrade"`
		DailyHours  int    `json:"dailyHours"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	userID, _ := c.Get("userId")
	userIDStr := fmt.Sprintf("%v", userID)
	
	contextPrompt := h.buildSystemPrompt(c, userIDStr)
	
	prompt := fmt.Sprintf(`بناءً على سياق الطالب المذكور سابقاً، قم بإنشاء جدول دراسي مخصص.
تاريخ الامتحان المتوقع: %s
الدرجة المستهدفة: %s
ساعات المذاكرة اليومية المتاحة: %d ساعة.

يرجى تقديم الجدول في شكل جدول Markdown يومي/أسبوعي مع نصائح للتركيز على نقاط الضعف المذكورة في نتائج الامتحانات.`, req.ExamDate, req.TargetGrade, req.DailyHours)

	messages := []map[string]interface{}{
		{"role": "system", "content": contextPrompt},
		{"role": "user", "content": prompt},
	}

	reply, _, err := h.callAIWithRetryCustom(messages, "google/gemini-2.0-flash-001")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate plan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plan": reply})
}

// SummarizeLesson summarizes lesson content and creates a mind map
func (h *AIHandler) SummarizeLesson(c *gin.Context) {
	var req struct {
		Content string `json:"content"`
		Format  string `json:"format"` // "points" or "detailed"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	prompt := fmt.Sprintf(`قم بتلخيص المحتوى التالي لطلاب الثانوية العامة بأسلوب مبسط ومنظم.
المحتوى: %s
المطلوب:
1. نقاط أساسية (Key Points).
2. كود Mermaid.js لإنشاء خريطة ذهنية (Mind Map) تمثل المحتوى.
استخدم اللغة العربية.`, req.Content)

	messages := []map[string]interface{}{
		{"role": "system", "content": "أنت خبير في تلخيص المناهج الدراسية وتحويلها لخرائط ذهنية."},
		{"role": "user", "content": prompt},
	}

	reply, _, err := h.callAIWithRetryCustom(messages, "google/gemini-2.0-flash-001")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to summarize"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"summary": reply})
}

// GradeEssay evaluates a student's essay
func (h *AIHandler) GradeEssay(c *gin.Context) {
	var req struct {
		Content  string `json:"content"`
		Topic    string `json:"topic"`
		Language string `json:"language"` // "Arabic" or "English" or "French"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	prompt := fmt.Sprintf(`قم بتقييم موضوع التعبير التالي:
الموضوع/العنوان: %s
اللغة: %s
النص: %s

المطلوب تقديم التقييم كالتالي:
1. الدرجة التقديرية (من 100).
2. نقاط القوة.
3. الأخطاء اللغوية والنحوية وتصحيحها.
4. نصائح لتحسين الأسلوب في المرات القادمة.`, req.Topic, req.Language, req.Content)

	messages := []map[string]interface{}{
		{"role": "system", "content": "أنت مصحح لغوي خبير في تقييم مواضيع التعبير لطلاب الثانوية العامة."},
		{"role": "user", "content": prompt},
	}

	reply, _, err := h.callAIWithRetryCustom(messages, "google/gemini-2.0-flash-001")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to grade essay"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"evaluation": reply})
}

// Proxy functions for the new features
func GenerateStudyPlanProxy(c *gin.Context) {
	handler := NewAIHandler()
	handler.GenerateStudyPlan(c)
}

func SummarizeLessonProxy(c *gin.Context) {
	handler := NewAIHandler()
	handler.SummarizeLesson(c)
}

func GradeEssayProxy(c *gin.Context) {
	handler := NewAIHandler()
	handler.GradeEssay(c)
}
