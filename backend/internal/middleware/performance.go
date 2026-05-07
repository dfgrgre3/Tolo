package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// PerformanceMonitor logs the duration of each request and warns if it exceeds a threshold
func PerformanceMonitor() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)
		status := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		// Log performance
		if duration > 500*time.Millisecond {
			log.Printf("[PERF] SLOW REQUEST: %s %s | Status: %d | Duration: %v ⚠️", c.Request.Method, path, status, duration)
		} else if gin.Mode() == gin.DebugMode {
			log.Printf("[PERF] %s %s | Status: %d | Duration: %v", c.Request.Method, path, status, duration)
		}
	}
}
