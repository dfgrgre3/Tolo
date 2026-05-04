package middleware

import (
	"fmt"
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
	jwksCache     *keyfunc.JWKS
	jwksCacheErr  error
	jwksLastLoad  time.Time
	jwksMutex     sync.RWMutex
	jwksTTL       = 1 * time.Hour // Default TTL, can be overridden by JWKS_CACHE_TTL_HOURS env var
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
		var tokenString string
		// Check Authorization header first to prevent cookie tossing attacks
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			tokenString = strings.TrimSpace(authHeader[len("Bearer "):])
		}
		// Fall back to cookie if header is not present or invalid
		if tokenString == "" {
			cookieToken, err := c.Cookie("access_token")
			if err == nil && strings.TrimSpace(cookieToken) != "" {
				tokenString = strings.TrimSpace(cookieToken)
			}
		}

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
		c.Set("role", claims.Role)
		c.Set("jti", claims.JTI)

		// Impersonation support: If user is admin, check for impersonation cookie
		if claims.Role == "ADMIN" {
			if impersonatedID, err := c.Cookie("impersonate_user_id"); err == nil && impersonatedID != "" {
				// Verify the impersonated user exists
				var targetUser models.User
				if err := db.DB.First(&targetUser, "id = ?", impersonatedID).Error; err == nil {
					c.Set("originalAdminId", claims.Subject)
					c.Set("userId", impersonatedID)
					c.Set("role", string(targetUser.Role))
					c.Set("isImpersonating", true)

					// Update claims for granular permissions
					claims.Subject = impersonatedID
					claims.Role = string(targetUser.Role)
				}
			}
		}

		// Fetch permissions for granular control
		var perms models.JSONStringArray
		if err := db.DB.Model(&models.User{}).Where("id = ?", claims.Subject).Pluck("permissions", &perms).Error; err == nil {
			c.Set("permissions", []string(perms))
		}

		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		rs, _ := role.(string)
		if rs != "ADMIN" && rs != "MODERATOR" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin panel access required"})
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

		// Check specific permission (ADMIN uses same granular checks as other roles)
		perms, exists := c.Get("permissions")
		if !exists || perms == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "No permissions assigned"})
			return
		}

		userPermissions := perms.([]string)

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

		isDevelopment := cfg.Environment == "development" || cfg.Environment == ""

		// Strict allowed origins - never allow all origins in production
		allowedOrigins := []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"https://thanawy.net",
			"https://www.thanawy.net",
		}

		isAllowed := false

		// In development, only allow localhost origins, not any origin
		if isDevelopment && origin != "" {
			// Check if origin is localhost or LAN IP
			if strings.HasPrefix(origin, "http://localhost:") || 
			   strings.HasPrefix(origin, "https://localhost:") ||
			   strings.HasPrefix(origin, "http://127.0.0.1:") ||
			   strings.HasPrefix(origin, "http://192.168.") ||
			   strings.HasPrefix(origin, "http://172.") ||
			   strings.HasPrefix(origin, "http://10.") {
				isAllowed = true
			} else {
				// In development, you might also want to allow specific dev domains
				// But never allow arbitrary origins
				for _, o := range allowedOrigins {
					if origin == o {
						isAllowed = true
						break
					}
				}
			}
		} else {
			for _, o := range allowedOrigins {
				if origin == o {
					isAllowed = true
					break
				}
			}
		}

		// Set CORS headers only for allowed origins
		if origin != "" && isAllowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if origin == "" && isDevelopment {
			// No origin header - allow simple requests in development
			// But don't set wildcard for requests with origin
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Dev-Admin-Bypass, accept, origin, Cache-Control, X-Requested-With, Connect-Protocol-Version, Connect-Timeout-Ms, Connect-Content-Encoding, X-Grpc-Web, X-User-Agent")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Grpc-Status, Grpc-Message, Grpc-Status-Details-Bin, Connect-Protocol-Version, Connect-Content-Encoding")

		if c.Request.Method == "OPTIONS" {
			if isAllowed || (origin == "" && isDevelopment) {
				c.AbortWithStatus(204)
			} else {
				c.AbortWithStatus(403)
			}
			return
		}

		c.Next()
	}
}