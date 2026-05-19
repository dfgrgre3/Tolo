package middleware

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/MicahParks/keyfunc/v2"
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
)

var (
	cachedConfig *config.Config
	configOnce   sync.Once

	// JWKS cache with TTL to allow refresh
	jwksCache    *keyfunc.JWKS
	jwksCacheErr error
	jwksLastLoad time.Time
	jwksMutex    sync.RWMutex
	jwksTTL      = 1 * time.Hour // Default TTL, can be overridden by JWKS_CACHE_TTL_HOURS env var
)

// Context keys for storing user information in request context
type ContextKey string

const (
	UserContextKey  ContextKey = "user_id"
	RoleContextKey  ContextKey = "user_role"
	EmailContextKey ContextKey = "user_email"
)

func getConfig() *config.Config {
	configOnce.Do(func() {
		cachedConfig = config.Load()
	})
	return cachedConfig
}

func getJWKS() (*keyfunc.JWKS, error) {
	// Check cache with read lock first
	jwksMutex.RLock()
	if jwksCache != nil && jwksCacheErr == nil && time.Since(jwksLastLoad) < jwksTTL {
		cached := jwksCache
		err := jwksCacheErr
		jwksMutex.RUnlock()
		return cached, err
	}
	jwksMutex.RUnlock()

	// Cache expired or invalid, acquire write lock to reload
	jwksMutex.Lock()
	defer jwksMutex.Unlock()

	// Double-check after acquiring write lock to avoid redundant reloads
	if jwksCache != nil && jwksCacheErr == nil && time.Since(jwksLastLoad) < jwksTTL {
		return jwksCache, jwksCacheErr
	}

	// Reload JWKS
	jwksURL := os.Getenv("CLERK_JWKS_URL")
	if jwksURL == "" {
		jwksCacheErr = fmt.Errorf("CLERK_JWKS_URL environment variable is not set")
		jwksCache = nil
		jwksLastLoad = time.Now()
		return nil, jwksCacheErr
	}

	// Allow TTL override via environment variable
	ttl := jwksTTL
	if ttlStr := os.Getenv("JWKS_CACHE_TTL_HOURS"); ttlStr != "" {
		if hours, err := strconv.Atoi(ttlStr); err == nil && hours > 0 {
			ttl = time.Duration(hours) * time.Hour
		}
	}

	options := keyfunc.Options{
		RefreshInterval:  ttl,
		RefreshRateLimit: time.Minute * 5,
		RefreshTimeout:   time.Second * 10,
	}

	newJwks, err := keyfunc.Get(jwksURL, options)
	if err != nil {
		jwksCacheErr = err
		jwksCache = nil
	} else {
		jwksCache = newJwks
		jwksCacheErr = nil
	}
	jwksLastLoad = time.Now()

	return jwksCache, jwksCacheErr
}

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := extractToken(c)
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		tokenService := &services.TokenService{}
		claims, err := tokenService.ValidateToken(tokenString)
		if err != nil || claims.Subject == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		c.Set("userId", claims.Subject)
		c.Set("jti", claims.JTI)

		hydrateUserContext(c, claims.Subject, claims.Role)
		processImpersonation(c, claims.Subject)

		c.Next()
	}
}

// Helper to extract JWT token from Authorization header or access_token cookie
func extractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		token := strings.TrimSpace(authHeader[len("Bearer "):])
		if token != "" {
			return token
		}
	}

	if cookieToken, err := c.Cookie("access_token"); err == nil {
		return strings.TrimSpace(cookieToken)
	}
	return ""
}

// Helper to set user permissions in context
func setContextPermissions(c *gin.Context, permissions models.JSONStringArray) {
	if permissions == nil {
		c.Set("permissions", []string{})
	} else {
		c.Set("permissions", []string(permissions))
	}
}

// Helper to fetch and set user role/permissions in context from database or fallback
func hydrateUserContext(c *gin.Context, userID string, fallbackRole string) {
	var user models.User
	if err := db.DB.Unscoped().Select("role", "permissions").Where("id = ?", userID).First(&user).Error; err == nil {
		c.Set("role", string(user.Role))
		setContextPermissions(c, user.Permissions)
	} else {
		c.Set("role", strings.ToUpper(fallbackRole))
		c.Set("permissions", []string{})
	}
}

// Helper to handle admin impersonation logic if applicable
func processImpersonation(c *gin.Context, adminID string) {
	currentRole, _ := c.Get("role")
	if currentRole != "ADMIN" {
		return
	}

	impersonatedID, err := c.Cookie("impersonate_user_id")
	if err != nil || impersonatedID == "" {
		return
	}

	var targetUser models.User
	if err := db.DB.Unscoped().Select("id", "role", "permissions").First(&targetUser, "id = ?", impersonatedID).Error; err == nil {
		c.Set("originalAdminId", adminID)
		c.Set("userId", impersonatedID)
		c.Set("role", string(targetUser.Role))
		c.Set("isImpersonating", true)
		setContextPermissions(c, targetUser.Permissions)
	}
}


func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		rs, _ := role.(string)
		if rs != "ADMIN" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			return
		}
		c.Next()
	}
}

func ModeratorRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		rs, _ := role.(string)
		if rs != "ADMIN" && rs != "MODERATOR" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Moderator access required"})
			return
		}
		c.Next()
	}
}

func AdminOrModerator() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		rs, _ := role.(string)
		if rs != "ADMIN" && rs != "MODERATOR" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin or Moderator access required"})
			return
		}
		c.Next()
	}
}

func RoleRequired(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		currentRole, _ := c.Get("role")
		for _, role := range roles {
			if currentRole == role {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
	}
}

func PermissionRequired(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if user is authenticated
		role, roleExists := c.Get("role")
		if !roleExists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		// Check specific permission
		perms, _ := c.Get("permissions")
		var userPermissions []string
		if perms != nil {
			userPermissions = perms.([]string)
		}

		// Create a temporary user object to use the HasPermission logic
		user := &models.User{
			Role:        models.UserRole(role.(string)),
			Permissions: models.JSONStringArray(userPermissions),
		}

		if user.HasPermission(permission) {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Missing required permission: " + permission})
	}
}

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		cfg := getConfig()
		isDev := cfg.Environment == "development" || cfg.Environment == ""

		allowedOrigins := []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"https://thanawy.net",
			"https://www.thanawy.net",
		}

		isAllowed := isOriginAllowed(origin, isDev, allowedOrigins)

		// DEBUG LOGGING - Remove after diagnosis
		log.Printf("[CORS DEBUG] Environment: %s, Origin: '%s', IsAllowed: %v, Method: %s, Path: %s",
			cfg.Environment, origin, isAllowed, c.Request.Method, c.Request.URL.Path)

		setCorsHeaders(c, origin, isAllowed)

		if c.Request.Method == "OPTIONS" {
			handleOptions(c, origin, isAllowed, isDev)
			return
		}

		c.Next()
	}
}

// Helper to check if the request origin is allowed
func isOriginAllowed(origin string, isDev bool, allowedOrigins []string) bool {
	if origin == "" {
		return false
	}

	// In development, allow localhost and LAN IPs
	if isDev && isLocalhostOrLAN(origin) {
		return true
	}

	// Check against explicit allowed origins
	for _, o := range allowedOrigins {
		if origin == o {
			return true
		}
	}

	return false
}

// Helper to check if origin is localhost or a LAN IP
func isLocalhostOrLAN(origin string) bool {
	prefixes := []string{
		"http://localhost:",
		"https://localhost:",
		"http://127.0.0.1:",
		"http://192.168.",
		"http://172.",
		"http://10.",
	}
	for _, prefix := range prefixes {
		if strings.HasPrefix(origin, prefix) {
			return true
		}
	}
	return false
}

// Helper to set CORS response headers
func setCorsHeaders(c *gin.Context, origin string, isAllowed bool) {
	if origin != "" && isAllowed {
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
	}

	c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Dev-Admin-Bypass, accept, origin, Cache-Control, X-Requested-With, Connect-Protocol-Version, Connect-Timeout-Ms, Connect-Content-Encoding, X-Grpc-Web, X-User-Agent, Idempotency-Key")
	c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
	c.Writer.Header().Set("Access-Control-Expose-Headers", "Grpc-Status, Grpc-Message, Grpc-Status-Details-Bin, Connect-Protocol-Version, Connect-Content-Encoding")
}

// Helper to handle CORS preflight OPTIONS requests
func handleOptions(c *gin.Context, origin string, isAllowed bool, isDev bool) {
	if isAllowed || (origin == "" && isDev) {
		c.AbortWithStatus(http.StatusNoContent)
	} else {
		c.AbortWithStatus(http.StatusForbidden)
	}
}

