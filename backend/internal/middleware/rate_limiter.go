package middleware

import (
	"context"
	"net/http"
	"strings"
	"thanawy-backend/internal/db"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
)

const (
	// Default rate limit: 5 attempts per minute per IP
	DefaultRateLimit = 5
	DefaultWindow    = 1 * time.Minute
	// Strict rate limit for auth endpoints: 3 attempts per minute per IP
	AuthRateLimit = 3
	AuthWindow    = 1 * time.Minute
	// Admin rate limit: 10 requests per minute per IP
	AdminRateLimit = 10
	AdminWindow    = 1 * time.Minute
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
		now := time.Now().UnixNano() / int64(time.Millisecond) // Use milliseconds for precision
		windowMs := int64(window.Milliseconds())
		windowStart := now - windowMs

		// LUA script for atomic sliding window rate limiting
		// KEYS[1] = key
		// ARGV[1] = windowStart
		// ARGV[2] = now
		// ARGV[3] = maxRequests
		// ARGV[4] = windowSeconds
		script := `
			redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
			local count = redis.call('ZCARD', KEYS[1])
			if count < tonumber(ARGV[3]) then
				redis.call('ZADD', KEYS[1], ARGV[2], ARGV[2])
				redis.call('EXPIRE', KEYS[1], ARGV[4])
				return 1
			else
				return 0
			end
		`

		result, err := db.Redis.Eval(ctx, script, []string{key}, windowStart, now, maxRequests, int(window.Seconds())).Int()
		if err != nil {
			// If Redis fails, allow the request (fail open) but log it
			c.Next()
			return
		}

		if result == 0 {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded. Please try again later.",
				"retry_after": window.Seconds(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthRateLimiter is a stricter rate limiter for authentication endpoints
func AuthRateLimiter() gin.HandlerFunc {
	return RateLimiter(AuthRateLimit, AuthWindow)
}

// AdminRateLimiter protects admin routes from brute force
func AdminRateLimiter() gin.HandlerFunc {
	return RateLimiter(AdminRateLimit, AdminWindow)
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

		// Attempt to get email from body using the official Gin way to support multiple reads
		var email string
		if c.Request.Method == http.MethodPost {
			var body struct {
				Email string `json:"email"`
			}
			if err := c.ShouldBindBodyWith(&body, binding.JSON); err == nil {
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

		// Use atomic INCR and EXPIRE for login rate limiting
		// We use a LUA script here too to ensure atomicity of INCR + EXPIRE
		script := `
			local count = redis.call('INCR', KEYS[1])
			if count == 1 then
				redis.call('EXPIRE', KEYS[1], ARGV[1])
			end
			return count
		`

		count, err := db.Redis.Eval(ctx, script, []string{key}, int(AuthWindow.Seconds())).Int()
		if err != nil {
			// If Redis fails, allow the request (fail open)
			c.Next()
			return
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
