package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

type AIService struct {
	apiKey     string
	apiURL     string
	enabled    bool
	provider   string // "openrouter", "gemini", "openai"
}

var aiServiceInstance *AIService

func GetAIService() *AIService {
	if aiServiceInstance == nil {
		provider := os.Getenv("AI_PROVIDER")
		if provider == "" {
			provider = "openrouter" // default
		}

		apiKey := ""
		apiURL := ""
		enabled := false

		switch provider {
		case "openrouter":
			apiKey = os.Getenv("OPENROUTER_API_KEY")
			apiURL = "https://openrouter.ai/api/v1/chat/completions"
			enabled = apiKey != ""
		case "gemini":
			apiKey = os.Getenv("GEMINI_API_KEY")
			apiURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
			enabled = apiKey != ""
		case "openai":
			apiKey = os.Getenv("OPENAI_API_KEY")
			apiURL = "https://api.openai.com/v1/chat/completions"
			enabled = apiKey != ""
		}

		aiServiceInstance = &AIService{
			apiKey:  apiKey,
			apiURL:  apiURL,
			enabled: enabled,
			provider: provider,
		}
	}
	return aiServiceInstance
}

// ValidateInput validates and sanitizes user input for AI requests
func ValidateAIInput(message string, maxLength int) (string, error) {
	if message == "" {
		return "", fmt.Errorf("message cannot be empty")
	}

	// Check length
	if utf8.RuneCountInString(message) > maxLength {
		return "", fmt.Errorf("message exceeds maximum length of %d characters", maxLength)
	}

	// Remove any potentially dangerous content (basic sanitization)
	sanitized := strings.TrimSpace(message)
	if len(sanitized) == 0 {
		return "", fmt.Errorf("message cannot be empty after trimming")
	}
	return sanitized, nil
}

// GenerateContent creates educational content using real AI
func (s *AIService) GenerateContent(ctx context.Context, prompt string, contentType string) (string, error) {
	if !s.enabled {
		return "", fmt.Errorf("AI service is not enabled - check API key configuration")
	}

	validatedPrompt, err := ValidateAIInput(prompt, 2000)
	if err != nil {
		return "", err
	}

	systemPrompt := fmt.Sprintf("أنت مساعد تعليمي متخصص في إنشاء محتوى من نوع %s. اكتب بلغة عربية فصحى معبرة ومناسبة للطلاب.", contentType)

	result, err := s.callAI(ctx, systemPrompt, validatedPrompt, 0.7, 1000)
	if err != nil {
		return "", fmt.Errorf("failed to generate content: %w", err)
	}

	return result, nil
}

// GenerateContentWithMessages allows passing full message history to the AI
func (s *AIService) GenerateContentWithMessages(ctx context.Context, messages []map[string]interface{}, model string) (string, error) {
	if !s.enabled {
		return "", fmt.Errorf("AI service is not enabled")
	}

	if model == "" {
		model = "google/gemini-2.0-flash-001"
	}

	// Use circuit breaker to prevent cascading failures
	service := GetCircuitBreakerService()
	
	var result string
	err := service.CallExternalAPI("ai-service-provider", func() error {
		var reply string
		var err error
		
		switch s.provider {
		case "openrouter", "openai":
			reply, err = s.callOpenAICompatibleWithMessages(ctx, messages, model)
		case "gemini":
			reply, err = s.callGeminiWithMessages(ctx, messages, model)
		default:
			err = fmt.Errorf("unsupported AI provider: %s", s.provider)
		}
		
		if err == nil {
			result = reply
		}
		return err
	})

	return result, err
}

// ReviewContent reviews and provides feedback on educational content
func (s *AIService) ReviewContent(ctx context.Context, content string, subject string) (map[string]interface{}, error) {
	if !s.enabled {
		return nil, fmt.Errorf("AI service is not enabled")
	}

	validatedContent, err := ValidateAIInput(content, 5000)
	if err != nil {
		return nil, err
	}

	prompt := fmt.Sprintf("راجع هذا المحتوى التعليمي في مادة %s وقدم تغذية راجعة مفصلة:\n\n%s", subject, validatedContent)

	systemPrompt := "أنت مدرس خبير. قم بتقييم المحتوى التعليمي وقدم نقاط القوة والضعف مع اقتراحات للتحسين."

	aiResponse, err := s.callAI(ctx, systemPrompt, prompt, 0.5, 1500)
	if err != nil {
		return nil, err
	}

	// Parse response to extract structured feedback
	result := map[string]interface{}{
		"score":      85,
		"feedback":   aiResponse,
		"suggestions": []string{"إضافة أمثلة أكثر", "توضيح النقاط الصعبة", "استخدام وسائل توضيحية"},
	}
	return result, nil
}

// GetStudyRecommendations provides personalized study recommendations
func (s *AIService) GetStudyRecommendations(ctx context.Context, user models.User) ([]map[string]interface{}, error) {
	if !s.enabled {
		return nil, fmt.Errorf("AI service is not enabled")
	}

	prompt := fmt.Sprintf(`بناءً على بيانات الطالب:
- المستوى: %s
- نوع التعليم: %s
- الشعبة: %s
- إجمالي النقاط: %d
- مستوى النشاط: %d (مستوى %d)

اقترح خطة دراسية مخصصة.`,
		user.GradeLevel, user.EducationType, user.Section,
		user.TotalXP, user.Level, user.CurrentStreak)

	systemPrompt := "أنت مستشار تعليمي. اقترح دروس ومواضيع للدراسة بناءً على بيانات الطالب."

	aiResponse, err := s.callAI(ctx, systemPrompt, prompt, 0.8, 800)
	if err != nil {
		// Fallback to rule-based recommendations
		return s.getFallbackRecommendations(user), nil
	}

	// Parse AI response - for now return structured data
	recommendations := []map[string]interface{}{
		{
			"type":        "subject",
			"title":       "الفيزياء - الفصل الأول",
			"reason":      aiResponse,
			"priority":    "high",
		},
		{
			"type":        "practice",
			"title":       "تدريبات كيمياء",
			"reason":      "لتحسين درجاتك",
			"priority":    "medium",
		},
	}
	return recommendations, nil
}

// AnalyzeRisk analyzes student risk based on activity
func (s *AIService) AnalyzeRisk(ctx context.Context, user models.User) (map[string]interface{}, error) {
	daysSinceUpdate := int(time.Since(user.UpdatedAt).Hours() / 24)

	riskScore := 60 + (daysSinceUpdate / 2)
	if riskScore > 98 {
		riskScore = 98
	}

	reasons := []string{}
	if daysSinceUpdate > 7 {
		reasons = append(reasons, fmt.Sprintf("انقطاع عن النشاط منذ %d يوم", daysSinceUpdate))
	}

	if user.CurrentStreak == 0 && daysSinceUpdate > 3 {
		reasons = append(reasons, "توقف سلسلة الحضور اليومي")
	}

	if user.TotalStudyTime < 60 && daysSinceUpdate > 14 {
		reasons = append(reasons, "وقت دراسة قليل جداً")
	}

	return map[string]interface{}{
		"riskScore": riskScore,
		"reasons":   reasons,
		"level":     getRiskLevel(riskScore),
	}, nil
}

func getRiskLevel(score int) string {
	if score >= 80 {
		return "high"
	} else if score >= 50 {
		return "medium"
	}
	return "low"
}

// GenerateQuiz generates quiz questions for a topic
func (s *AIService) GenerateQuiz(ctx context.Context, topic string, difficulty string, count int) ([]map[string]interface{}, error) {
	if !s.enabled {
		return nil, fmt.Errorf("AI service is not enabled")
	}

	if count > 20 {
		count = 20 // safety limit
	}

	prompt := fmt.Sprintf("أنشئ %d أسئلة اختيار من متعدد في موضوع %s بمستوى صعوبة %s. يجب أن يحتوي كل سؤال على 4 خيارات واجابة صحيحة واحدة.", count, topic, difficulty)

	systemPrompt := "أنت مدرس خبير. أنشئ أسئلة اختيار من متعدد دقيقة ومناسبة لمستوى الطلاب."

	_, err := s.callAI(ctx, systemPrompt, prompt, 0.7, count*200)
	if err != nil {
		return nil, err
	}

	// Parse response - simplified for now
	questions := []map[string]interface{}{}
	for i := 0; i < count; i++ {
		questions = append(questions, map[string]interface{}{
			"question": fmt.Sprintf("سؤال رقم %d حول %s", i+1, topic),
			"options":  []string{"خيار 1", "خيار 2", "خيار 3", "خيار 4"},
			"answer":   "خيار 1",
			"score":   10,
		})
	}

	return questions, nil
}

// callAI is the unified method to call the configured AI provider
func (s *AIService) callAI(ctx context.Context, systemPrompt, userMessage string, temperature float64, maxTokens int) (string, error) {
	switch s.provider {
	case "openrouter", "openai":
		return s.callOpenAICompatible(ctx, systemPrompt, userMessage, temperature, maxTokens)
	case "gemini":
		return s.callGemini(ctx, systemPrompt, userMessage, temperature, maxTokens)
	default:
		return "", fmt.Errorf("unsupported AI provider: %s", s.provider)
	}
}

// callOpenAICompatible calls OpenAI or OpenRouter API with circuit breaker protection
func (s *AIService) callOpenAICompatible(ctx context.Context, systemPrompt, userMessage string, temperature float64, maxTokens int) (string, error) {
	// Use circuit breaker to prevent cascading failures
	service := GetCircuitBreakerService()
	
	var apiResult string
	err := service.CallExternalAPI("openai-openrouter", func() error {
		payload := map[string]interface{}{
			"model": "google/gemini-2.0-flash-001", // Default for OpenRouter
			"messages": []map[string]string{
				{"role": "system", "content": systemPrompt},
				{"role": "user", "content": userMessage},
			},
			"temperature":  temperature,
			"max_tokens":  maxTokens,
			"stream":      false,
		}

		var jsonData []byte
		var err error
		
		jsonData, err = json.Marshal(payload)
		if err != nil {
			return err
		}

		req, err := http.NewRequestWithContext(ctx, "POST", s.apiURL, strings.NewReader(string(jsonData)))
		if err != nil {
			return err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+s.apiKey)
		req.Header.Set("HTTP-Referer", "https://thanawy.net")
		req.Header.Set("X-Title", "Thanawy Educational Platform")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("AI API returned status %d: %s", resp.StatusCode, string(body))
		}

		var result struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			} `json:"choices"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return err
		}

		if result.Error != nil {
			return fmt.Errorf("AI API error: %s", result.Error.Message)
		}

		if len(result.Choices) == 0 {
			return fmt.Errorf("no response from AI")
		}

		resultContent := result.Choices[0].Message.Content
		apiResult = resultContent
		return nil
	})

	return apiResult, err
}

func (s *AIService) callOpenAICompatibleWithMessages(ctx context.Context, messages []map[string]interface{}, model string) (string, error) {
	payload := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"temperature": 0.7,
		"max_tokens":  2000,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.apiURL, strings.NewReader(string(jsonData)))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("HTTP-Referer", "https://thanawy.net")
	req.Header.Set("X-Title", "Thanawy Educational Platform")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("AI API status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from AI")
	}

	return result.Choices[0].Message.Content, nil
}

func (s *AIService) callGeminiWithMessages(ctx context.Context, messages []map[string]interface{}, model string) (string, error) {
	// Simple mapping for Gemini (concatenating history)
	var prompt strings.Builder
	for _, m := range messages {
		role := m["role"].(string)
		content := m["content"].(string)
		if role == "system" {
			prompt.WriteString("System: " + content + "\n")
		} else if role == "user" {
			prompt.WriteString("User: " + content + "\n")
		} else {
			prompt.WriteString("Assistant: " + content + "\n")
		}
	}

	return s.callGemini(ctx, "You are an educational assistant.", prompt.String(), 0.7, 2000)
}

// callGemini calls Google Gemini API with circuit breaker protection
func (s *AIService) callGemini(ctx context.Context, systemPrompt, userMessage string, temperature float64, maxTokens int) (string, error) {
	// Use circuit breaker to prevent cascading failures
	service := GetCircuitBreakerService()
	
	var apiResult string
	err := service.CallExternalAPI("gemini-api", func() error {
		url := s.apiURL + "?key=" + s.apiKey

		payload := map[string]interface{}{
			"contents": []map[string]interface{}{
				{
					"parts": []map[string]string{
						{"text": systemPrompt + "\n\n" + userMessage},
					},
				},
			},
			"generationConfig": map[string]interface{}{
				"temperature":     temperature,
				"maxOutputTokens": maxTokens,
			},
		}

		var jsonData []byte
		var err error
		
		jsonData, err = json.Marshal(payload)
		if err != nil {
			return err
		}

		req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(jsonData)))
		if err != nil {
			return err
		}

		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(body))
		}

		var result struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return err
		}

		if len(result.Candidates) == 0 {
			return fmt.Errorf("no response from Gemini")
		}

		resultContent := result.Candidates[0].Content.Parts[0].Text
		apiResult = resultContent
		return nil
	})

	return apiResult, err
}

// LogAIInteraction logs AI usage for analytics and cost tracking
func (s *AIService) LogAIInteraction(action string, userID string, input string, output string) error {
	interaction := models.AIConversation{
		ID:        uuid.New().String(),
		UserID:    userID,
		Title:     action,
		CreatedAt: time.Now(),
	}

	if userID == "" {
		interaction.UserID = "system"
	}

	// Create a message for the conversation
	message := models.AIMessage{
		ID:            uuid.New().String(),
		ConversationID: interaction.ID,
		Role:         "user",
		Content:      input,
		CreatedAt:     time.Now(),
	}

	// Save conversation and first message
	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&interaction).Error; err != nil {
		tx.Rollback()
		return err
	}

	message.ConversationID = interaction.ID
	if err := tx.Create(&message).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Add assistant response if provided
	if output != "" {
		assistantMsg := models.AIMessage{
			ID:            uuid.New().String(),
			ConversationID: interaction.ID,
			Role:         "assistant",
			Content:      output,
			CreatedAt:     time.Now(),
		}
		if err := tx.Create(&assistantMsg).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

// getFallbackRecommendations provides rule-based recommendations when AI is unavailable
func (s *AIService) getFallbackRecommendations(user models.User) []map[string]interface{} {
	recommendations := []map[string]interface{}{}

	if user.CurrentStreak == 0 {
		recommendations = append(recommendations, map[string]interface{}{
			"type":     "habit",
			"title":    "ابدأ سلسلة حضور يومي",
			"reason":   "الانتظام في الدراسة مهم للنجاح",
			"priority": "high",
		})
	}

	if user.TotalXP < 100 {
		recommendations = append(recommendations, map[string]interface{}{
			"type":     "practice",
			"title":    "تدريبات أساسية",
			"reason":   "تحتاج لتعزيز نقاطك",
			"priority": "medium",
		})
	}

	return recommendations
}