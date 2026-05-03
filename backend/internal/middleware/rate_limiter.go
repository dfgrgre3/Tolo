package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimiter holds Redis client for distributed rate limiting
type RateLimiter struct {
	client *redis.Client
}

// NewRateLimiter creates a new rate limiter instance
func NewRateLimiter(redisClient *redis.Client) *RateLimiter {
	return &RateLimiter{client: redisClient}
}

// RateLimitByIP creates a rate limiting middleware by IP address
// limit: requests per window
// window: time window duration
func (rl *RateLimiter) RateLimitByIP(limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		key := fmt.Sprintf("rate_limit:ip:%s", ip)

		count, err := rl.incrementCounter(key, window)
		if err != nil {
			// If Redis fails, FAIL CLOSED for security (deny request)
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "rate limiter unavailable, please try again later",
			})
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, limit-count)))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(window).Unix()))

		if count > limit {
			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "rate limit exceeded",
				"retry_after": int(window.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitByUser creates a rate limiting middleware by authenticated user ID
// limit: requests per window
// window: time window duration
func (rl *RateLimiter) RateLimitByUser(limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			// Not authenticated, skip user-level rate limiting
			c.Next()
			return
		}

		key := fmt.Sprintf("rate_limit:user:%s", userID)
		count, err := rl.incrementCounter(key, window)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "rate limiter unavailable, please try again later",
			})
			return
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, limit-count)))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(window).Unix()))

		if count > limit {
			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "user rate limit exceeded",
				"retry_after": int(window.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitByEndpoint creates per-endpoint rate limiting
// endpoint: unique identifier for the endpoint
// limit: requests per window
// window: time window duration
func (rl *RateLimiter) RateLimitByEndpoint(endpoint string, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// If user is authenticated, include user ID for stricter per-user limits
		if userID, exists := c.Get("user_id"); exists {
			endpoint = fmt.Sprintf("%s:user:%s", endpoint, userID)
		}

		key := fmt.Sprintf("rate_limit:endpoint:%s", endpoint)

		count, err := rl.incrementCounter(key, window)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "rate limiter unavailable, please try again later",
			})
			return
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, limit-count)))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(window).Unix()))

		if count > limit {
			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "endpoint rate limit exceeded",
				"retry_after": int(window.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// incrementCounter increments a counter in Redis and returns the new count
// Uses INCR + EXPIRE for atomicity
func (rl *RateLimiter) incrementCounter(key string, window time.Duration) (int, error) {
	// Fail closed if Redis client is nil
	if rl.client == nil {
		return 0, fmt.Errorf("redis client is nil")
	}
	
	ctx := rl.client.Context()

	// INCR is atomic
	val, err := rl.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}

	// Set expiration on first request (TTL = window)
	if val == 1 {
		rl.client.Expire(ctx, key, window)
	}

	return int(val), nil
}

// SlidingWindowRateLimit uses sliding window algorithm (more accurate)
// Useful for APIs that need precise rate limiting
func (rl *RateLimiter) SlidingWindowRateLimit(key string, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rl.client == nil {
			// Fail closed - if Redis is unavailable, deny requests
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "rate limiter unavailable",
			})
			return
		}

		ctx := rl.client.Context()
		now := time.Now().UnixMilli()
		windowStart := now - window.Milliseconds()

		// Remove old entries outside the window
		rl.client.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", windowStart))

		// Count requests in current window
		count, err := rl.client.ZCard(ctx, key).Result()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "rate limiter unavailable",
			})
			return
		}

		if count >= int64(limit) {
			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			c.Abort()
			return
		}

		// Add current request
		rl.client.ZAdd(ctx, key, redis.Z{
			Score:  float64(now),
			Member: fmt.Sprintf("%d", now),
		})
		rl.client.Expire(ctx, key, window)

		c.Next()
	}
}

// CircuitBreaker pattern for external APIs
type CircuitBreaker struct {
	client    *redis.Client
	threshold int       // failure threshold
	timeout   time.Duration
}

// NewCircuitBreaker creates a new circuit breaker
func NewCircuitBreaker(redisClient *redis.Client, threshold int, timeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		client:    redisClient,
		threshold: threshold,
		timeout:   timeout,
	}
}

// CheckCircuitBreaker returns true if the circuit is open (failing)
func (cb *CircuitBreaker) CheckCircuitBreaker(serviceName string) (isOpen bool, err error) {
	ctx := cb.client.Context()
	key := fmt.Sprintf("circuit_breaker:%s", serviceName)

	count, err := cb.client.Get(ctx, key).Int()
	if err == redis.Nil {
		return false, nil // Circuit is closed (normal)
	}
	if err != nil {
		return false, err
	}

	return count >= cb.threshold, nil
}

// RecordSuccess resets the circuit breaker
func (cb *CircuitBreaker) RecordSuccess(serviceName string) error {
	ctx := cb.client.Context()
	key := fmt.Sprintf("circuit_breaker:%s", serviceName)
	return cb.client.Del(ctx, key).Err()
}

// RecordFailure increments failure counter
func (cb *CircuitBreaker) RecordFailure(serviceName string) error {
	ctx := cb.client.Context()
	key := fmt.Sprintf("circuit_breaker:%s", serviceName)

	err := cb.client.Incr(ctx, key).Err()
	if err != nil {
		return err
	}

	// Set expiration
	cb.client.Expire(ctx, key, cb.timeout)
	return nil
}

// CircuitBreakerMiddleware wraps a service call with circuit breaker protection
func (cb *CircuitBreaker) CircuitBreakerMiddleware(serviceName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		isOpen, err := cb.CheckCircuitBreaker(serviceName)
		if err != nil {
			c.Next()
			return
		}

		if isOpen {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":   "service temporarily unavailable",
				"service": serviceName,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
