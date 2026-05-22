package router

import (
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// SetupPublicRoutes configures public API endpoints
func SetupPublicRoutes(router *gin.Engine) {
	// Public Course routes
	router.GET("/api/courses", handlers.GetSubjects)
	router.GET("/api/courses/:id", handlers.GetSubject)
	router.GET("/api/courses/:id/lessons", handlers.GetCourseLessons)
	router.GET("/api/courses/:id/reviews", handlers.GetCourseReviews)
	router.GET("/api/categories", handlers.GetCategories)
	router.GET("/api/courses/categories", handlers.GetCategories)
	router.GET("/api/teachers", handlers.GetTeachers)

	// Public settings route
	router.GET("/api/settings", handlers.GetSystemSettings)

	// Public blog route (published posts only)
	router.GET("/api/blog", handlers.GetPublicBlogPosts)
	router.GET("/api/blog/:slug", handlers.GetPublicBlogPost)

	// Public events route
	router.GET("/api/events", handlers.GetPublicEvents)

	// Public Exam routes (read-only)
	router.GET("/api/exams", handlers.GetExams)
	router.GET("/api/exams/results", handlers.GetExamResults)

	// Activity routes moved to protected group

	// AI routes (require auth)
	ai := router.Group("/api/ai")
	ai.Use(middleware.Auth())
	{
		ai.POST("/exam", handlers.AIExamProxy)
		ai.POST("/suggest", handlers.AISuggestProxy)
		ai.POST("/chat", handlers.AIChatProxy)
		ai.POST("/tips", handlers.AITipsProxy)
		ai.GET("/conversations", handlers.GetConversations)
		ai.GET("/conversation/:id", handlers.GetConversation)
		ai.DELETE("/conversation/:id", handlers.DeleteConversation)
		ai.POST("/explain-mistake", handlers.ExplainMistakeProxy)
		ai.POST("/study-planner", handlers.GenerateStudyPlanProxy)
		ai.POST("/summarize", handlers.SummarizeLessonProxy)
		ai.POST("/grade-essay", handlers.GradeEssayProxy)
		ai.GET("/recommendations", handlers.GetAIRecommendations)
		ai.POST("/recommendations/track", handlers.TrackAIRecommendation)
	}

	// Guest User
	router.GET("/api/users/guest", handlers.GetGuestUser)

	// Paymob Webhook (POST only — GET is a CSRF vector)
	router.POST("/api/payments/paymob/callback", handlers.PaymobWebhook)

	// Clerk Webhook
	router.POST("/api/webhooks/clerk", handlers.ClerkWebhook)

	// WebSocket
	router.GET("/api/ws", middleware.Auth(), handlers.WSHandler)

	// Public Forum routes
	router.GET("/api/forum/categories", handlers.GetForumCategories)
	router.GET("/api/forum/posts", handlers.GetForumPosts)
	router.POST("/api/forum/posts", middleware.Auth(), handlers.CreateForumPost)
	router.GET("/api/forum/posts/:id", handlers.GetForumPost)
	router.POST("/api/forum/posts/:id/view", handlers.IncrementForumPostView)
	router.GET("/api/forum/posts/:id/replies", handlers.GetForumPostReplies)
	router.POST("/api/forum/posts/:id/replies", middleware.Auth(), handlers.CreateForumPostReply)

	// Public community routes
	router.GET("/api/announcements", handlers.GetPublicAnnouncements)
	router.POST("/api/announcements", middleware.Auth(), handlers.CreatePublicAnnouncement)

	// Lightweight community chat compatibility routes
	router.GET("/api/chat/conversations/:userId", middleware.Auth(), handlers.GetChatConversations)
	router.GET("/api/chat/messages/:userId/:chatUserId", middleware.Auth(), handlers.GetChatMessages)
	router.POST("/api/chat/messages", middleware.Auth(), handlers.SendChatMessage)

	// Public Library routes
	router.GET("/api/library/categories", handlers.GetLibraryCategories)
}
