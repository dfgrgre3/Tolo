package middleware

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CorrelationMiddleware adds request ID and trace ID to each request
// These IDs are used for distributed tracing and debugging
func CorrelationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate unique request ID
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = "req_" + uuid.New().String()
		}

		// Generate or retrieve trace ID (useful for microservices)
		traceID := c.GetHeader("X-Trace-ID")
		if traceID == "" {
			traceID = "trace_" + uuid.New().String()
		}

		// Store in Gin context
		c.Set("request_id", requestID)
		c.Set("trace_id", traceID)

		// Add to response headers for client-side logging
		c.Header("X-Request-ID", requestID)
		c.Header("X-Trace-ID", traceID)

		// Store in request context for downstream use
		ctx := c.Request.Context()
		ctx = context.WithValue(ctx, RequestIDKey, requestID)
		ctx = context.WithValue(ctx, TraceIDKey, traceID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// LogRequestMetrics logs key metrics about the request (optional middleware)
func LogRequestMetrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Store method and path for logging
		c.Set("request_method", c.Request.Method)
		c.Set("request_path", c.Request.URL.Path)

		c.Next()
	}
}
