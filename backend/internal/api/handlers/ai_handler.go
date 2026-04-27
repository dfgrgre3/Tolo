package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func AIExamProxy(c *gin.Context) {
	var body interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Proxy to OpenRouter as default or Gemini
	_ = os.Getenv("OPENROUTER_API_KEY")
	_ = "https://openrouter.ai/api/v1/chat/completions"

	// Simplified proxy logic: convert internal request to OpenRouter/OpenAI format
	// For a real implementation, we would construct a prompt based on subject/year/lesson
	
	// Mock response for now to ensure compatibility without burning credits during setup
	// In a real system, we would call the external API here.
	
	c.JSON(http.StatusOK, gin.H{
		"examId": "ai-gen-" + fmt.Sprint(os.Getpid()),
		"questions": []gin.H{
			{
				"question":      "ما هي عاصمة مصر؟",
				"type":          "multiple_choice",
				"options":       []string{"القاهرة", "الإسكندرية", "الجيزة", "الأقصر"},
				"correctAnswer": "القاهرة",
				"explanation":   "القاهرة هي العاصمة التاريخية والحالية لجمهورية مصر العربية.",
			},
		},
	})
}

func AISuggestProxy(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"suggestions": []string{
			"ابدأ بمراجعة الوحدة الأولى من مادة الفيزياء",
			"قم بحل امتحان تجريبي لمادة اللغة العربية",
		},
	})
}

func AIChatProxy(c *gin.Context) {
	var req struct {
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message is required"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reply": "أنا مساعدك الذكي Tolo AI. كيف يمكنني مساعدتك اليوم في دراستك؟",
	})
}

func AITipsProxy(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"tips": []string{
			"خصص 50 دقيقة للدراسة و10 دقائق للراحة",
			"اشرب كميات كافية من الماء أثناء المذاكرة",
		},
	})
}

// Helper to call external AI
func callAIProvider(url string, apiKey string, payload interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("HTTP-Referer", "https://thanawy.com") // Required by OpenRouter
	req.Header.Set("X-Title", "Thanawy Platform")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}
