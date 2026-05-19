package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setTestEnv(t *testing.T, key, value string) {
	t.Helper()
	old := os.Getenv(key)
	os.Setenv(key, value)
	t.Cleanup(func() {
		if old == "" {
			os.Unsetenv(key)
		} else {
			os.Setenv(key, old)
		}
	})
}

func unsetTestEnv(t *testing.T, key string) {
	t.Helper()
	old := os.Getenv(key)
	os.Unsetenv(key)
	t.Cleanup(func() {
		if old != "" {
			os.Setenv(key, old)
		}
	})
}

func TestValidateSecrets_MissingVars(t *testing.T) {
	unsetTestEnv(t, "DATABASE_URL")
	unsetTestEnv(t, "JWT_SECRET")
	unsetTestEnv(t, "CLERK_WEBHOOK_SECRET")
	setTestEnv(t, "NODE_ENV", "production")

	router := setupTestRouter()
	router.Use(ValidateSecrets(DefaultSecretsValidatorConfig()))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestValidateSecrets_PlaceholderValues(t *testing.T) {
	setTestEnv(t, "DATABASE_URL", "postgresql://localhost:5432/test")
	setTestEnv(t, "JWT_SECRET", "your-jwt-secret-here")
	setTestEnv(t, "CLERK_WEBHOOK_SECRET", "whsec_test")
	setTestEnv(t, "NODE_ENV", "production")

	router := setupTestRouter()
	router.Use(ValidateSecrets(DefaultSecretsValidatorConfig()))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestValidateSecrets_ValidSecrets(t *testing.T) {
	setTestEnv(t, "DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
	setTestEnv(t, "JWT_SECRET", "a-very-long-and-random-secret-key-12345")
	setTestEnv(t, "CLERK_WEBHOOK_SECRET", "whsec_actual_secret_value_here")
	setTestEnv(t, "NODE_ENV", "production")

	router := setupTestRouter()
	router.Use(ValidateSecrets(DefaultSecretsValidatorConfig()))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestValidateSecrets_SkipInDev(t *testing.T) {
	setTestEnv(t, "NODE_ENV", "development")
	unsetTestEnv(t, "DATABASE_URL")
	unsetTestEnv(t, "JWT_SECRET")
	unsetTestEnv(t, "CLERK_WEBHOOK_SECRET")

	router := setupTestRouter()
	router.Use(ValidateSecrets(DefaultSecretsValidatorConfig()))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestIsPlaceholderValue(t *testing.T) {
	tests := []struct {
		name     string
		key      string
		val      string
		expected bool
	}{
		{"your- prefix", "JWT_SECRET", "your-secret-here", true},
		{"CHANGE_ME", "DATABASE_URL", "CHANGE_ME", true},
		{"placeholder", "API_KEY", "placeholder-value", true},
		{"example", "SECRET", "example-secret", true},
		{"dummy", "KEY", "dummy-key", true},
		{"test prefix", "TOKEN", "test-token", true},
		{"test in url", "DATABASE_URL", "postgresql://user:pass@localhost:5432/test", false},
		{"short JWT_SECRET", "JWT_SECRET", "short", true},
		{"valid JWT_SECRET", "JWT_SECRET", "a-very-long-and-random-secret-key-12345", false},
		{"valid DATABASE_URL", "DATABASE_URL", "postgresql://user:pass@host:5432/db", false},
		{"valid webhook", "CLERK_WEBHOOK_SECRET", "whsec_actual_secret_123", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isPlaceholderValue(tt.key, tt.val)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateSecrets_CustomVars(t *testing.T) {
	setTestEnv(t, "CUSTOM_SECRET", "CHANGE_ME")
	setTestEnv(t, "NODE_ENV", "production")
	unsetTestEnv(t, "DATABASE_URL")
	unsetTestEnv(t, "JWT_SECRET")
	unsetTestEnv(t, "CLERK_WEBHOOK_SECRET")

	cfg := SecretsValidatorConfig{
		RequiredVars: []string{"CUSTOM_SECRET"},
		SkipInDev:    false,
	}

	router := setupTestRouter()
	router.Use(ValidateSecrets(cfg))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestValidateSecrets_AllPlaceholders(t *testing.T) {
	setTestEnv(t, "DATABASE_URL", "your-database-url")
	setTestEnv(t, "JWT_SECRET", "your-jwt-secret")
	setTestEnv(t, "CLERK_WEBHOOK_SECRET", "your-webhook-secret")
	setTestEnv(t, "NODE_ENV", "production")

	router := setupTestRouter()
	router.Use(ValidateSecrets(DefaultSecretsValidatorConfig()))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestValidateSecrets_MixedMissingAndPlaceholders(t *testing.T) {
	setTestEnv(t, "DATABASE_URL", "postgresql://user:pass@localhost:5432/test")
	setTestEnv(t, "JWT_SECRET", "CHANGE_ME")
	unsetTestEnv(t, "CLERK_WEBHOOK_SECRET")
	setTestEnv(t, "NODE_ENV", "production")

	router := setupTestRouter()
	router.Use(ValidateSecrets(DefaultSecretsValidatorConfig()))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestValidateSecrets_ProductionMode(t *testing.T) {
	setTestEnv(t, "NODE_ENV", "production")
	unsetTestEnv(t, "DATABASE_URL")

	router := setupTestRouter()
	router.Use(ValidateSecrets(DefaultSecretsValidatorConfig()))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func TestValidateSecrets_EmptyRequiredVars(t *testing.T) {
	setTestEnv(t, "NODE_ENV", "production")

	cfg := SecretsValidatorConfig{
		RequiredVars: []string{},
		SkipInDev:    false,
	}

	router := setupTestRouter()
	router.Use(ValidateSecrets(cfg))
	router.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
