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

	"github.com/google/uuid"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

type AIService struct {
	apiKey     string
	apiURL     string
	enabled    bool
}

var aiServiceInstance *AIService

func GetAIService() *AIService {
	if aiServiceInstance == nil {
		aiServiceInstance = &AIService{
			apiKey:  os.Getenv("AI_API_KEY"),
			apiURL:  os.Getenv("AI_API_URL"),
			enabled: os.Getenv("AI_ENABLED") == "true",
		}
	}
	return aiServiceInstance
}

// GenerateContent creates educational content using AI
func (s *AIService) GenerateContent(ctx context.Context, prompt string, contentType string) (string, error) {
	if !s.enabled {
		return "", fmt.Errorf("AI service is not enabled")
	}

	// TODO: Implement actual AI API call (OpenAI, Claude, etc.)
	// For now, return a placeholder
	return fmt.Sprintf("تم إنشاء محتوى من نوع %s بناءً على: %s", contentType, prompt), nil
}

// ReviewContent reviews and provides feedback on educational content
func (s *AIService) ReviewContent(ctx context.Context, content string, subject string) (map[string]interface{}, error) {
	if !s.enabled {
		return nil, fmt.Errorf("AI service is not enabled")
	}

	// TODO: Implement actual AI review
	return map[string]interface{}{
		"score":       85,
		"feedback":    "المحتوى جيد ويحتاج إلى بعض التحسينات في الترتيب.",
		"suggestions": []string{"إضافة أمثلة أكثر", "توضيح النقاط الصعبة"},
	}, nil
}

// GetStudyRecommendations provides personalized study recommendations
func (s *AIService) GetStudyRecommendations(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	if !s.enabled {
		return nil, fmt.Errorf("AI service is not enabled")
	}

	// TODO: Implement actual AI recommendations based on user's study history
	return []map[string]interface{}{
		{
			"type":        "subject",
			"title":       "الفيزياء - الفصل الأول",
			"reason":      "تحتاج إلى مراجعة هذا الجزء",
			"priority":    "high",
		},
		{
			"type":        "practice",
			"title":       "تدريبات كيمياء",
			"reason":      "لتحسين درجاتك",
			"priority":    "medium",
		},
	}, nil
}

// AnalyzeRisk analyzes student risk based on activity
func (s *AIService) AnalyzeRisk(ctx context.Context, user models.User) (map[string]interface{}, error) {
	if !s.enabled {
		return nil, fmt.Errorf("AI service is not enabled")
	}

	daysSinceUpdate := int(time.Since(user.UpdatedAt).Hours() / 24)
	riskScore := 60 + (daysSinceUpdate / 2)
	if riskScore > 98 {
		riskScore = 98
	}

	reasons := []string{}
	if daysSinceUpdate > 7 {
		reasons = append(reasons, fmt.Sprintf("انقطاع عن النشاط منذ %d يوم", daysSinceUpdate))
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

// LogAIInteraction logs AI usage for analytics
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
		ConversationID: interaction.ID,
		Role:         "user",
		Content:      input,
		CreatedAt:     time.Now(),
	}
	
	// Save conversation and first message
	tx := db.DB.Begin()
	defer tx.Rollback()

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

// GenerateQuiz generates quiz questions for a topic
func (s *AIService) GenerateQuiz(ctx context.Context, topic string, difficulty string, count int) ([]map[string]interface{}, error) {
	if !s.enabled {
		return nil, fmt.Errorf("AI service is not enabled")
	}

	// TODO: Implement actual quiz generation
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

// HTTP Client helper for AI API calls
func (s *AIService) callAIAPI(ctx context.Context, endpoint string, payload interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.apiURL+endpoint, strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}