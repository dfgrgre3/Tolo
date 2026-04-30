package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var (
	cachedConfig *config.Config
	configOnce  sync.Once
)

func getConfig() *config.Config {
	configOnce.Do(func() {
		cachedConfig = config.Load()
	})
	return cachedConfig
}

func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := ""
		authHeader := c.GetHeader("Authorization")
		
		if authHeader != "" {
			tokenString = strings.Replace(authHeader, "Bearer ", "", 1)
		} else {
			// Try to get from cookie
			cookie, err := c.Cookie("access_token")
			if err == nil {
				tokenString = cookie
			}
		}

		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		cfg := getConfig()

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate the signing method to prevent algorithm confusion attacks
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil {
			if strings.Contains(err.Error(), "token is expired") {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token", "details": err.Error()})
			}
			c.Abort()
			return
		}

		if !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token invalid"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

	// Advanced Session Validation (JTI Check)
	jti, hasJTI := claims["jti"].(string)
	if !hasJTI {
		jti, _ = claims["id"].(string) // Fallback for old tokens or refresh tokens
	}

	if jti != "" {
		// Use Redis for session validation (Stateless JWT with Redis session store)
		sessionStore := db.NewRedisSessionStore()
		if sessionStore != nil {
			// Check if session exists in Redis
			active, err := sessionStore.IsSessionActive(jti)
			if err != nil || !active {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Session revoked or invalid"})
				c.Abort()
				return
			}
			
			// Update last active time in background (non-blocking)
			go func() {
				if err := sessionStore.UpdateLastAccessed(jti); err != nil {
					// Log error but don't fail the request
					fmt.Printf("Failed to update session last accessed: %v\n", err)
				}
			}()
		} else {
			// Fallback to database if Redis is not available (graceful degradation)
			var session models.UserSession
			if err := db.DB.Where("id = ? AND \"isActive\" = ?", jti, true).First(&session).Error; err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Session revoked or invalid"})
				c.Abort()
				return
			}
			// Update last active in background
			go func(id string) {
				db.DB.Model(&models.UserSession{}).Where("id = ?", id).Update("lastAccessed", time.Now())
			}(jti)
		}
	}

		c.Set("userId", claims["sub"])
		c.Set("role", claims["role"])
		c.Set("jti", jti)
		c.Next()
	}
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func RoleRequired(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}

		authorized := false
		for _, role := range roles {
			if userRole == role {
				authorized = true
				break
			}
		}

		if !authorized {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}
		c.Next()
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

		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, Connect-Protocol-Version, Connect-Timeout-Ms, Connect-Content-Encoding, X-Grpc-Web, X-User-Agent")
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
