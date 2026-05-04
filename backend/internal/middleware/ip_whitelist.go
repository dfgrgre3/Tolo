package middleware

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

// IPWhitelistMiddleware checks if the request IP is whitelisted
func IPWhitelistMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip whitelist check for public endpoints
		if isPublicEndpoint(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Get whitelist settings
		var settings models.IPWhitelistSettings
		if err := db.DB.First(&settings).Error; err != nil {
			// No settings found, allow all
			c.Next()
			return
		}

		// Check if whitelist is enabled
		if !settings.IsEnabled {
			c.Next()
			return
		}

		// Get client IP
		clientIP := c.ClientIP()

		// Check internal IPs
		if settings.AllowInternalIPs {
			for _, cidr := range settings.InternalIPRanges {
				if isIPInCIDR(clientIP, cidr) {
					c.Next()
					return
				}
			}
		}

		// Determine which whitelist to check based on endpoint
		whitelistType := getWhitelistType(c.Request.URL.Path, c.GetBool("is_admin"))

		// Check if IP is whitelisted
		var entries []models.IPWhitelistEntry
		db.DB.Where("type = ? AND status = ?", whitelistType, "active").Find(&entries)

		allowed := false
		for _, entry := range entries {
			if entry.CIDR != "" {
				if isIPInCIDR(clientIP, entry.CIDR) {
					allowed = true
					break
				}
			} else if entry.IPAddress == clientIP {
				allowed = true
				break
			}
		}

		if !allowed {
			// Log blocked attempt
			if settings.LogBlockedAttempts {
				logBlockedAttempt(c, clientIP)
			}

			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Access denied: IP not whitelisted",
				"ip":      clientIP,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// isPublicEndpoint checks if the endpoint is public
func isPublicEndpoint(path string) bool {
	publicPaths := []string{
		"/healthz",
		"/readyz",
		"/api/auth/login",
		"/api/auth/register",
		"/api/public",
	}

	for _, public := range publicPaths {
		if strings.HasPrefix(path, public) {
			return true
		}
	}

	return false
}

// getWhitelistType determines which whitelist to check
func getWhitelistType(path string, isAdmin bool) string {
	if strings.HasPrefix(path, "/api/admin") && isAdmin {
		return "admin"
	}
	if strings.HasPrefix(path, "/api/webhook") {
		return "webhook"
	}
	return "api"
}

// isIPInCIDR checks if an IP is within a CIDR range
func isIPInCIDR(ip, cidr string) bool {
	_, ipnet, err := net.ParseCIDR(cidr)
	if err != nil {
		return false
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	return ipnet.Contains(parsedIP)
}

// logBlockedAttempt logs a blocked access attempt
func logBlockedAttempt(c *gin.Context, ip string) {
	attempt := models.BlockedIPAttempt{
		IPAddress:   ip,
		Endpoint:    c.Request.URL.Path,
		Method:      c.Request.Method,
		UserAgent:   c.Request.UserAgent(),
		AttemptedAt: time.Now(),
		Reason:      "IP not whitelisted",
	}

	db.DB.Create(&attempt)
}
