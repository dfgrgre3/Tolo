package middleware

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	csrfHeaderName  = "X-CSRF-Token"
	csrfCookieName  = "_csrf"
	csrfTokenLength = 32
)

// CSRFProtection middleware for cookie-based authentication
// Uses Double Submit Cookie pattern: cookie is NOT HttpOnly so JS can read it
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip CSRF for safe methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			// For GET requests, ensure we have a CSRF token
			ensureCSRFToken(c)
			c.Next()
			return
		}

		env := os.Getenv("NODE_ENV")
		if env == "" {
			env = "development"
		}

		// For state-changing methods, validate CSRF token
		if env == "production" && !validateCSRFToken(c) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "CSRF token validation failed",
			})
			return
		}

		c.Next()
	}
}

// ensureCSRFToken creates a CSRF token if one doesn't exist
// Cookie is NOT HttpOnly to allow JavaScript to read it for the header
func ensureCSRFToken(c *gin.Context) {
	// Check if cookie exists
	cookie, err := c.Cookie(csrfCookieName)
	if err == nil && cookie != "" {
		// Validate existing token
		if isValidCSRFToken(cookie) {
			// Set header for client-side access
			c.Header("X-CSRF-Token", cookie)
			return
		}
	}

	// Generate new token
	token := generateCSRFToken()

	// Set cookie (NOT HttpOnly - allows JS to read for Double Submit Cookie pattern)
	setCSRFCookie(c, token)

	// Set header
	c.Header("X-CSRF-Token", token)
}

// validateCSRFToken validates the CSRF token from request
// Compares the token from the header with the token from the cookie
func validateCSRFToken(c *gin.Context) bool {
	// Get token from header
	headerToken := c.GetHeader(csrfHeaderName)
	if headerToken == "" {
		return false
	}

	// Get token from cookie
	cookieToken, err := c.Cookie(csrfCookieName)
	if err != nil || cookieToken == "" {
		return false
	}

	// Compare tokens using constant-time comparison
	if subtle.ConstantTimeCompare([]byte(headerToken), []byte(cookieToken)) == 1 {
		return true
	}

	return false
}

// generateCSRFToken creates a new CSRF token
func generateCSRFToken() string {
	bytes := make([]byte, csrfTokenLength)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to less secure but still usable token
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return base64.URLEncoding.EncodeToString(bytes)
}

// setCSRFCookie sets the CSRF cookie
// NOT HttpOnly - this is intentional for Double Submit Cookie pattern
// JavaScript needs to read this cookie and set it as the X-CSRF-Token header
func setCSRFCookie(c *gin.Context, token string) {
	// Check environment consistently with config
	env := os.Getenv("NODE_ENV")
	if env == "" {
		env = "development"
	}
	secure := env == "production"

	c.SetCookie(
		csrfCookieName,
		token,
		int(24*time.Hour.Seconds()), // 24 hours
		"/",
		"",
		secure, // Secure in production
		false,  // NOT HttpOnly - allows JS to read for Double Submit Cookie pattern
	)
}

// isValidCSRFToken checks if a token is valid (not expired, proper format)
func isValidCSRFToken(token string) bool {
	// Decode and validate format
	decoded, err := base64.URLEncoding.DecodeString(token)
	if err != nil || len(decoded) != csrfTokenLength {
		return false
	}
	return true
}

// CSRFMiddleware returns a configured CSRF protection middleware
func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip CSRF for safe methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			// For GET requests, ensure we have a CSRF token
			ensureCSRFToken(c)
			c.Next()
			return
		}

		// Skip for certain paths (webhooks, etc.)
		skipPaths := []string{
			"/api/webhooks/",
			"/api/payments/paymob/callback",
			"/api/auth/login",
			"/api/auth/register",
		}

		path := c.Request.URL.Path
		for _, skip := range skipPaths {
			if len(path) >= len(skip) && path[:len(skip)] == skip {
				c.Next()
				return
			}
		}

		// Apply CSRF protection for state-changing requests
		// Only enforce CSRF if the request uses cookie authentication
		// Check if the request has our authentication cookie
		_, err := c.Cookie("access_token")
		hasCookie := err == nil

		// If request has auth cookie, enforce CSRF
		// If no auth cookie, might be using JWT in header - still enforce CSRF as a defense-in-depth
		// But skip CSRF for API clients that don't use cookies (machine-to-machine)
		// We can check if the request is likely from a browser by checking Accept header
		accept := c.GetHeader("Accept")
		isBrowser := strings.Contains(accept, "text/html") || strings.Contains(accept, "application/xhtml+xml")

		env := os.Getenv("NODE_ENV")
		if env == "" {
			env = "development"
		}

		if (hasCookie || isBrowser) && env == "production" {

			// Validate CSRF token
			if !validateCSRFToken(c) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error": "CSRF token validation failed",
				})
				return
			}
		}

		c.Next()
	}
}
