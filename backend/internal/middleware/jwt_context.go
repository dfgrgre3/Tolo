package middleware

import (
	"context"
	"fmt"
	"strings"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Claims represents JWT claims
type Claims struct {
	UserID string          `json:"user_id"`
	Email  string          `json:"email"`
	Role   models.UserRole `json:"role"`
	jwt.RegisteredClaims
}

// ContextKey for storing values in context
type ContextKey string

const (
	UserContextKey  ContextKey = "user_id"
	RoleContextKey  ContextKey = "user_role"
	EmailContextKey ContextKey = "user_email"
	RequestIDKey    ContextKey = "request_id"
	TraceIDKey      ContextKey = "trace_id"
)

// JWTAuthMiddleware validates JWT tokens from Authorization header
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "missing authorization header"})
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid authorization format"})
			return
		}

		tokenString := parts[1]
		claims := &Claims{}

		// Parse and validate token
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// Validate algorithm to prevent algorithm confusion attacks
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(config.Load().JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid or expired token"})
			return
		}

		// Validate claims
		if claims.UserID == "" || claims.Email == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid token claims"})
			return
		}

		// Store in Gin context
		c.Set("user_id", claims.UserID)
		c.Set("user_role", claims.Role)
		c.Set("user_email", claims.Email)

		// Store in Go context for downstream use
		ctx := context.WithValue(c.Request.Context(), UserContextKey, claims.UserID)
		ctx = context.WithValue(ctx, RoleContextKey, claims.Role)
		ctx = context.WithValue(ctx, EmailContextKey, claims.Email)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// OptionalJWTMiddleware attempts to parse JWT but doesn't fail if missing
func OptionalJWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(config.Load().JWTSecret), nil
		})

		if err == nil && token.Valid && claims.UserID != "" {
			c.Set("user_id", claims.UserID)
			c.Set("user_role", claims.Role)
			c.Set("user_email", claims.Email)

			ctx := context.WithValue(c.Request.Context(), UserContextKey, claims.UserID)
			ctx = context.WithValue(ctx, RoleContextKey, claims.Role)
			ctx = context.WithValue(ctx, EmailContextKey, claims.Email)
			c.Request = c.Request.WithContext(ctx)
		}

		c.Next()
	}
}

// GetUserIDFromContext extracts user ID from context (safe extraction)
func GetUserIDFromContext(c *gin.Context) (string, error) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", fmt.Errorf("user_id not found in context")
	}

	id, ok := userID.(string)
	if !ok || id == "" {
		return "", fmt.Errorf("invalid user_id in context")
	}

	return id, nil
}

// GetRoleFromContext extracts user role from context
func GetRoleFromContext(c *gin.Context) (models.UserRole, error) {
	role, exists := c.Get("user_role")
	if !exists {
		return "", fmt.Errorf("user_role not found in context")
	}

	r, ok := role.(models.UserRole)
	if !ok {
		return "", fmt.Errorf("invalid user_role in context")
	}

	return r, nil
}

// RequireRole middleware to check if user has specific role
func RequireRole(requiredRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, err := GetRoleFromContext(c)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}

		// Check if user's role is in required roles
		hasRole := false
		for _, r := range requiredRoles {
			if role == r {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
			return
		}

		c.Next()
	}
}

// RequirePermission middleware for resource-level access control
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := GetUserIDFromContext(c)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}

		// TODO: Load user from database and check permissions
		// For now, this is a placeholder that should be implemented with proper RBAC
		if userID == "" {
			c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
			return
		}

		c.Next()
	}
}
