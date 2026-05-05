package router

import (
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"
)

// SetupAuthRoutes configures authentication endpoints
func SetupAuthRoutes(router *gin.Engine) {
	auth := router.Group("/api/auth")
	{
		auth.POST("/login", middleware.LoginRateLimiter(), handlers.Login)
		auth.POST("/register", middleware.AuthRateLimiter(), handlers.Register)
		auth.POST("/logout", handlers.Logout)
		auth.POST("/refresh", handlers.RefreshToken)
		auth.POST("/2fa/verify", handlers.Verify2FA)
		auth.POST("/magic-link/request", middleware.AuthRateLimiter(), handlers.RequestMagicLink)
		auth.GET("/magic-link/verify", handlers.VerifyMagicLink)
		auth.POST("/forgot-password", middleware.AuthRateLimiter(), handlers.ForgotPassword)
		auth.POST("/reset-password", handlers.ResetPassword)
		auth.GET("/verify-email", handlers.VerifyEmail)
		auth.POST("/resend-verification", middleware.AuthRateLimiter(), handlers.ResendVerification)

		// Protected auth routes
		auth.Use(middleware.Auth())
		{
			auth.GET("/me", handlers.GetProfile)
			auth.GET("/sessions", handlers.GetAuthSessions)
			auth.DELETE("/sessions", handlers.DeleteAuthSession)
			auth.PATCH("/sessions", handlers.UpdateAuthSession)
			auth.GET("/security-logs", handlers.GetSecurityLogs)
		}
	}
}
