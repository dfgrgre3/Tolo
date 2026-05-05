package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/pkg/circuitbreaker"
)

// Re-export for backward compatibility
type CircuitBreaker = circuitbreaker.CircuitBreaker
type CircuitState = circuitbreaker.CircuitState

const (
	StateClosed   = circuitbreaker.StateClosed
	StateOpen     = circuitbreaker.StateOpen
	StateHalfOpen = circuitbreaker.StateHalfOpen
)

// GetCircuitBreaker re-exports the package function
func GetCircuitBreaker(name string, failureThreshold int, timeout time.Duration) *CircuitBreaker {
	return circuitbreaker.GetCircuitBreaker(name, failureThreshold, timeout)
}

// CircuitBreakerMiddleware creates a gin middleware for circuit breaking
func CircuitBreakerMiddleware(name string, failureThreshold int, timeout time.Duration) gin.HandlerFunc {
	cb := GetCircuitBreaker(name, failureThreshold, timeout)

	return func(c *gin.Context) {
		if cb.State() == StateOpen {
			c.AbortWithStatusJSON(503, gin.H{
				"error":       "Service temporarily unavailable",
				"retry_after": timeout.Seconds(),
			})
			return
		}
		c.Next()
	}
}
