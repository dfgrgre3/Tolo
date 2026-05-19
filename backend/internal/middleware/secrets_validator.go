package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type SecretsValidatorConfig struct {
	RequiredVars []string
	SkipInDev    bool
}

func DefaultSecretsValidatorConfig() SecretsValidatorConfig {
	return SecretsValidatorConfig{
		RequiredVars: []string{
			"DATABASE_URL",
			"JWT_SECRET",
			"CLERK_WEBHOOK_SECRET",
		},
		SkipInDev: true,
	}
}

func ValidateSecrets(cfg SecretsValidatorConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.SkipInDev && os.Getenv("NODE_ENV") == "development" {
			c.Next()
			return
		}

		var missing []string
		var placeholder []string

		for _, key := range cfg.RequiredVars {
			val := os.Getenv(key)
			if val == "" {
				missing = append(missing, key)
				continue
			}
			if isPlaceholderValue(key, val) {
				placeholder = append(placeholder, key)
			}
		}

		if len(missing) > 0 || len(placeholder) > 0 {
			log.Printf("[SECURITY] Missing secrets: %v, Placeholders: %v", missing, placeholder)
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error":       "Service configuration incomplete",
				"missing":     missing,
				"placeholder": placeholder,
			})
			return
		}

		c.Next()
	}
}

func isPlaceholderValue(key, val string) bool {
	placeholders := []string{
		"your-",
		"change_me",
		"placeholder",
		"example",
		"dummy",
	}
	lower := strings.ToLower(val)
	for _, p := range placeholders {
		if strings.HasPrefix(lower, p) || strings.Contains(lower, p) {
			return true
		}
	}
	if strings.HasPrefix(lower, "test-") || strings.HasPrefix(lower, "test_") {
		return true
	}
	if key == "JWT_SECRET" && len(val) < 32 {
		return true
	}
	return false
}
