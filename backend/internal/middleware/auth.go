package middleware

import (
	"net/http"
	"os"
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
	jwksOnce     sync.Once
	jwks         *keyfunc.JWKS
)

func getConfig() *config.Config {
	configOnce.Do(func() {
		cachedConfig = config.Load()
	})
	return cachedConfig
}

func getJWKS() (*keyfunc.JWKS, error) {
	var err error
	jwksOnce.Do(func() {
		// Read from env, fallback to hardcoded if not set
		jwksURL := os.Getenv("CLERK_JWKS_URL")
		if jwksURL == "" {
			jwksURL = "https://winning-tetra-97.clerk.accounts.dev/.well-known/jwks.json"
		}
		options := keyfunc.Options{
			RefreshInterval:  time.Hour,
			RefreshRateLimit: time.Minute * 5,
			RefreshTimeout:   time.Second * 10,
		}
		jwks, err = keyfunc.Get(jwksURL, options)
	})
	return jwks, err
}

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("access_token")
		if err != nil || strings.TrimSpace(tokenString) == "" {
			authHeader := c.GetHeader("Authorization")
			if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
				tokenString = strings.TrimSpace(authHeader[len("Bearer "):])
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
		var permissions []string
		if err := db.DB.Model(&models.User{}).Where("id = ?", claims.Subject).Pluck("permissions", &permissions).Error; err == nil {
			c.Set("permissions", permissions)
		}

		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "ADMIN" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
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
		role, _ := c.Get("role")
		if role == "ADMIN" {
			c.Next()
			return
		}

		perms, exists := c.Get("permissions")
		if !exists {
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

		allowedOrigins := []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"https://thanawy.net",
			"https://www.thanawy.net",
		}

		isAllowed := false
		if isDevelopment && origin != "" {
			isAllowed = true
		} else {
			for _, o := range allowedOrigins {
				if origin == o {
					isAllowed = true
					break
				}
			}
		}

		if origin != "" && isAllowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if isDevelopment && origin == "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Dev-Admin-Bypass, accept, origin, Cache-Control, X-Requested-With, Connect-Protocol-Version, Connect-Timeout-Ms, Connect-Content-Encoding, X-Grpc-Web, X-User-Agent")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Grpc-Status, Grpc-Message, Grpc-Status-Details-Bin, Connect-Protocol-Version, Connect-Content-Encoding")

		if c.Request.Method == "OPTIONS" {
			if isAllowed || isDevelopment {
				c.AbortWithStatus(204)
			} else {
				c.AbortWithStatus(403)
			}
			return
		}

		c.Next()
	}
}
