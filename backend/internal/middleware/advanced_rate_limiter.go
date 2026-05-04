package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimitConfig defines rate limiting configuration
type RateLimitConfig struct {
	// Read operations (GET requests)
	ReadLimit  int
	ReadWindow time.Duration
	ReadBurst  int // Burst allowance for reads

	// Write operations (POST, PUT, PATCH, DELETE)
	WriteLimit  int
	WriteWindow time.Duration
	WriteBurst  int // Burst allowance for writes

	// Critical operations (bulk actions, exports)
	CriticalLimit  int
	CriticalWindow time.Duration
}

// DefaultRateLimitConfig returns default rate limiting configuration
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		// Reads: 100 requests per minute, burst of 20
		ReadLimit:  100,
		ReadWindow: time.Minute,
		ReadBurst:  20,

		// Writes: 30 requests per minute, burst of 5
		WriteLimit:  30,
		WriteWindow: time.Minute,
		WriteBurst:  5,

		// Critical: 10 requests per minute
		CriticalLimit:  10,
		CriticalWindow: time.Minute,
	}
}

// AdvancedRateLimiter provides granular rate limiting
type AdvancedRateLimiter struct {
	client *redis.Client
	config RateLimitConfig
}

// NewAdvancedRateLimiter creates an advanced rate limiter
func NewAdvancedRateLimiter(redisClient *redis.Client, config RateLimitConfig) *AdvancedRateLimiter {
	return &AdvancedRateLimiter{
		client: redisClient,
		config: config,
	}
}

// AdminRateLimiter applies different limits based on HTTP method and endpoint
func (arl *AdvancedRateLimiter) AdminRateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		if arl.client == nil {
			c.Next()
			return
		}

		// Determine rate limit category based on method and path
		limit, window, burst := arl.getRateLimitForRequest(c)

		// Get user ID or IP for tracking
		userID, exists := c.Get("user_id")
		var key string
		if exists {
			key = fmt.Sprintf("admin_ratelimit:user:%s:%s", userID, c.Request.Method)
		} else {
			key = fmt.Sprintf("admin_ratelimit:ip:%s:%s", c.ClientIP(), c.Request.Method)
		}

		// Check burst allowance first
		burstKey := key + ":burst"
		burstCount, _ := arl.getCount(c.Request.Context(), burstKey, window)

		if burstCount > burst {
			// Use sliding window for strict limiting after burst exceeded
			count, err := arl.slidingWindowCount(c.Request.Context(), key, window)
			if err != nil {
				c.Next()
				return
			}

			if count >= limit {
				arl.setRateLimitHeaders(c, limit, max(0, limit-count), window)
				c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error":       "rate limit exceeded",
					"retry_after": int(window.Seconds()),
					"limit_type":  arl.getLimitType(c),
				})
				c.Abort()
				return
			}
		} else {
			// Increment burst counter
			arl.incrementCounter(c.Request.Context(), burstKey, window)
		}

		// Increment main counter
		count, _ := arl.incrementCounter(c.Request.Context(), key, window)
		arl.setRateLimitHeaders(c, limit, max(0, limit-count), window)

		c.Next()
	}
}

// getRateLimitForRequest determines appropriate limits
func (arl *AdvancedRateLimiter) getRateLimitForRequest(c *gin.Context) (limit int, window time.Duration, burst int) {
	method := c.Request.Method
	path := c.Request.URL.Path

	// Critical operations check
	if isCriticalOperation(method, path) {
		return arl.config.CriticalLimit, arl.config.CriticalWindow, 1
	}

	// Read operations
	if method == "GET" || method == "HEAD" {
		return arl.config.ReadLimit, arl.config.ReadWindow, arl.config.ReadBurst
	}

	// Write operations (POST, PUT, PATCH, DELETE)
	return arl.config.WriteLimit, arl.config.WriteWindow, arl.config.WriteBurst
}

// isCriticalOperation checks if this is a critical/bulk operation
func isCriticalOperation(method, path string) bool {
	// Bulk operations
	if strings.Contains(path, "/bulk") ||
		strings.Contains(path, "/batch") ||
		strings.Contains(path, "/export") ||
		strings.Contains(path, "/import") {
		return true
	}

	// Mass delete operations
	if method == "DELETE" && strings.Contains(path, "/users") {
		return true
	}

	// Admin impersonation
	if strings.Contains(path, "/impersonate") {
		return true
	}

	return false
}

// getLimitType returns the type of limit for error messages
func (arl *AdvancedRateLimiter) getLimitType(c *gin.Context) string {
	if isCriticalOperation(c.Request.Method, c.Request.URL.Path) {
		return "critical"
	}
	if c.Request.Method == "GET" || c.Request.Method == "HEAD" {
		return "read"
	}
	return "write"
}

// setRateLimitHeaders sets standard rate limit headers
func (arl *AdvancedRateLimiter) setRateLimitHeaders(c *gin.Context, limit, remaining int, window time.Duration) {
	c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
	c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", max(0, remaining)))
	c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(window).Unix()))
	c.Header("X-RateLimit-Window", fmt.Sprintf("%d", int(window.Seconds())))
}

// incrementCounter increments a counter and sets TTL
func (arl *AdvancedRateLimiter) incrementCounter(ctx context.Context, key string, window time.Duration) (int, error) {
	val, err := arl.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}

	if val == 1 {
		arl.client.Expire(ctx, key, window)
	}

	return int(val), nil
}

// getCount gets current count without incrementing
func (arl *AdvancedRateLimiter) getCount(ctx context.Context, key string, window time.Duration) (int, error) {
	val, err := arl.client.Get(ctx, key).Int()
	if err == redis.Nil {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}

	return val, nil
}

// slidingWindowCount uses sliding window for more accurate limiting
func (arl *AdvancedRateLimiter) slidingWindowCount(ctx context.Context, key string, window time.Duration) (int, error) {
	now := time.Now().UnixMilli()
	windowStart := now - window.Milliseconds()

	// Remove old entries
	arl.client.ZRemRangeByScore(ctx, key+":sw", "-inf", fmt.Sprintf("%d", windowStart))

	// Count current window
	count, err := arl.client.ZCard(ctx, key+":sw").Result()
	if err != nil {
		return 0, err
	}

	// Add current request
	arl.client.ZAdd(ctx, key+":sw", redis.Z{
		Score:  float64(now),
		Member: fmt.Sprintf("%d", now),
	})
	arl.client.Expire(ctx, key+":sw", window)

	return int(count), nil
}

// RateLimitByTier applies different limits based on admin tier/role
func (arl *AdvancedRateLimiter) RateLimitByTier() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user role from context
		role, exists := c.Get("user_role")
		if !exists {
			// Default rate limiting for unknown roles
			arl.AdminRateLimiter()(c)
			return
		}

		// Apply tier-specific limits
		roleStr, ok := role.(string)
		if !ok {
			c.Next()
			return
		}

		config := arl.config

		switch roleStr {
		case "SUPER_ADMIN":
			// Super admins get higher limits
			config.ReadLimit *= 2
			config.WriteLimit *= 2
			config.ReadBurst *= 2
			config.WriteBurst *= 2
		case "MODERATOR":
			// Moderators get standard limits
			// No changes
		default:
			// Regular admins get slightly reduced limits
			config.ReadLimit = int(float64(config.ReadLimit) * 0.8)
			config.WriteLimit = int(float64(config.WriteLimit) * 0.8)
		}

		// Apply the tier-specific limiter
		tierLimiter := &AdvancedRateLimiter{
			client: arl.client,
			config: config,
		}
		tierLimiter.AdminRateLimiter()(c)
	}
}
