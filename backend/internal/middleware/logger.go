package middleware

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"time"
)

// LogEntry represents a single JSON log entry
type LogEntry struct {
	Timestamp  string                 `json:"@timestamp"`
	Level      string                 `json:"level"`
	Message    string                 `json:"message"`
	Service    string                 `json:"service"`
	Method     string                 `json:"method"`
	Path       string                 `json:"path"`
	Status     int                    `json:"status"`
	Latency    string                 `json:"latency"`
	IP         string                 `json:"ip"`
	UserAgent  string                 `json:"userAgent"`
	RequestID  string                 `json:"requestId,omitempty"`
	Context    map[string]interface{} `json:"context,omitempty"`
}

// StructuredLogger returns a gin middleware for structured JSON logging
func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Stop timer
		latency := time.Since(start)

		if raw != "" {
			path = path + "?" + raw
		}

		entry := LogEntry{
			Timestamp:  time.Now().Format(time.RFC3339),
			Level:      "info",
			Message:    fmt.Sprintf("%s %s -> %d", c.Request.Method, path, c.Writer.Status()),
			Service:    "thanawy-backend",
			Method:     c.Request.Method,
			Path:       path,
			Status:     c.Writer.Status(),
			Latency:    latency.String(),
			IP:         c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
			RequestID:  c.GetHeader("X-Request-ID"),
		}

		if c.Writer.Status() >= 400 {
			entry.Level = "warn"
		}
		if c.Writer.Status() >= 500 {
			entry.Level = "error"
		}

		// Convert to JSON and print to stdout (standard for Docker/K8s/ELK ingestion)
		jsonLog, _ := json.Marshal(entry)
		fmt.Println(string(jsonLog))
	}
}
