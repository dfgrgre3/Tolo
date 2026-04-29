package middleware

import (
	"context"
	"net/http"
	"strings"
	"thanawy-backend/internal/db"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	// Default rate limit: 5 attempts per minute per IP
	DefaultRateLimit = 5
	DefaultWindow   = 1 * time.Minute
	// Strict rate limit for auth endpoints: 3 attempts per minute per IP
	AuthRateLimit = 3
	AuthWindow   = 1 * time.Minute
)

// RateLimiter middleware for rate limiting using Redis
func RateLimiter(maxRequests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip if Redis is not available
		if db.Redis == nil {
			c.Next()
			return
		}

		// Get identifier (IP address)
		identifier := getClientIP(c)
		if identifier == "" {
			c.Next()
			return
		}

		// Create Redis key
		key := "rate_limit:" + identifier + ":" + c.FullPath()

		ctx := context.Background()
		
		// Use sliding window rate limiting with Redis
		now := time.Now().UnixNano()
		windowStart := now - int64(window)

		// Remove old entries
		db.Redis.ZRemRangeByScore(ctx, key, "0", string(rune(windowStart)))

		// Count requests in current window
		count, err := db.Redis.ZCard(ctx, key).Result()
		if err != nil {
			// If Redis fails, allow the request (fail open)
			c.Next()
			return
		}

		if count >= int64(maxRequests) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded. Please try again later.",
				"retry_after": window.Seconds(),
			})
			c.Abort()
			return
		}

		// Add current request
		db.Redis.ZAdd(ctx, key, redis.Z{
			Score:  float64(now),
			Member: now,
		})

		// Set expiry on the key
		db.Redis.Expire(ctx, key, window)

		c.Next()
	}
}

// AuthRateLimiter is a stricter rate limiter for authentication endpoints
func AuthRateLimiter() gin.HandlerFunc {
	return RateLimiter(AuthRateLimit, AuthWindow)
}

// LoginRateLimiter specifically for login endpoint to prevent CPU exhaustion attacks
func LoginRateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip if Redis is not available
		if db.Redis == nil {
			c.Next()
			return
		}

		// Get identifier - use IP and email combination for login attempts
		ip := getClientIP(c)
		email := strings.ToLower(strings.TrimSpace(c.PostForm("email")))
		
		// If no email in form, try JSON body
		if email == "" {
			var body struct {
				Email string `json:"email"`
			}
			if err := c.ShouldBindJSON(&body); err == nil {
				email = strings.ToLower(strings.TrimSpace(body.Email))
			}
		}

		// Create Redis key based on IP and email
		var key string
		if email != "" {
			key = "login_rate_limit:email:" + email
		} else {
			key = "login_rate_limit:ip:" + ip
		}

		ctx := context.Background()
		
		// Use fixed window rate limiting for simplicity
		count, err := db.Redis.Incr(ctx, key).Result()
		if err != nil {
			// If Redis fails, allow the request (fail open)
			c.Next()
			return
		}

		// Set expiry on first request
		if count == 1 {
			db.Redis.Expire(ctx, key, AuthWindow)
		}

		if count > AuthRateLimit {
			// Get TTL for retry-after header
			ttl, _ := db.Redis.TTL(ctx, key).Result()
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Too many login attempts. Please try again later.",
				"retry_after": ttl.Seconds(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// getClientIP extracts the real client IP from headers or connection
func getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header (common with proxies/load balancers)
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}

	// Fall back to remote address
	return c.ClientIP()
}