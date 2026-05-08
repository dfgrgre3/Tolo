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
		if isPublicEndpoint(c.Request.URL.Path) {
			c.Next()
			return
		}

		var settings models.IPWhitelistSettings
		if err := db.DB.First(&settings).Error; err != nil || !settings.IsEnabled {
			c.Next()
			return
		}

		clientIP := c.ClientIP()
		if isInternalIPAllowed(&settings, clientIP) {
			c.Next()
			return
		}

		whitelistType := getWhitelistType(c.Request.URL.Path, c.GetBool("is_admin"))
		var entries []models.IPWhitelistEntry
		db.DB.Where("type = ? AND status = ?", whitelistType, "active").Find(&entries)

		if isIPWhitelisted(entries, clientIP) {
			c.Next()
			return
		}

		if settings.LogBlockedAttempts {
			logBlockedAttempt(c, clientIP)
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "Access denied: IP not whitelisted",
			"ip":    clientIP,
		})
	}
}

// isInternalIPAllowed checks if the IP is within allowed internal ranges
func isInternalIPAllowed(settings *models.IPWhitelistSettings, clientIP string) bool {
	if !settings.AllowInternalIPs {
		return false
	}

	for _, cidr := range settings.InternalIPRanges {
		if isIPInCIDR(clientIP, cidr) {
			return true
		}
	}
	return false
}

// isIPWhitelisted checks if the IP matches any active whitelist entry
func isIPWhitelisted(entries []models.IPWhitelistEntry, clientIP string) bool {
	for _, entry := range entries {
		if entry.CIDR != "" && isIPInCIDR(clientIP, entry.CIDR) {
			return true
		}
		if entry.IPAddress == clientIP {
			return true
		}
	}
	return false
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
