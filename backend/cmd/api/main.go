package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	internalgrpc "thanawy-backend/internal/api/grpc"
	thanawyv1 "thanawy-backend/internal/proto/thanawy/v1"
	"thanawy-backend/internal/proto/thanawy/v1/thanawyv1connect"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize Configuration
	cfg := config.Load()

	// Initialize Database
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Schema changes must be explicit. AutoMigrate is unsafe during multi-instance rollouts.
	if os.Getenv("DB_AUTO_MIGRATE") == "true" {
		if cfg.Environment == "production" {
			log.Fatal("DB_AUTO_MIGRATE=true is not allowed in production; use RUN_DB_MIGRATIONS=true from a single release job")
		}
		if err := db.MigrateWithLock(); err != nil {
			log.Printf("AutoMigrate failed: %v", err)
		}
		if err := db.Seed(); err != nil {
			log.Printf("Seeding failed: %v", err)
		}
		log.Println("Development database schema synced and seeded.")
	}
	if os.Getenv("RUN_DB_MIGRATIONS") == "true" {
		if err := db.RunSQLMigrations(database); err != nil {
			log.Fatalf("SQL migrations failed: %v", err)
		}
		log.Println("SQL database migrations applied.")
	}

	// Initialize Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL != "" {
		db.ConnectRedis(redisURL)
	}

	// Initialize WebSocket Hub with Redis Pub/Sub support
	handlers.InitHub()

	// Initialize Services for gRPC/Connect
	courseSvc := &internalgrpc.CourseServiceServer{}
	authSvc := internalgrpc.NewAuthServiceServer()
	analyticsSvc := &internalgrpc.AnalyticsServiceServer{}

	// Setup Router
	router := gin.Default()

	// Apply Middlewares
	router.Use(middleware.CORS())
	router.Use(gin.Recovery())
	router.Use(middleware.RateLimiter(1000, time.Minute))
	// router.Use(middleware.StructuredLogger())

	// Serve static files for uploads
	router.Static("/uploads", "./uploads")

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})
	router.GET("/api/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	router.GET("/api/readyz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ready"})
	})

	// API Groups
	api := router.Group("/api")
	{
		// Connect RPC Handlers
		coursePath, courseHandler := thanawyv1connect.NewCourseServiceHandler(&internalgrpc.CourseConnectHandler{Svc: courseSvc})
		api.Any(strings.TrimPrefix(coursePath, "/")+"*action", gin.WrapH(http.StripPrefix("/api", courseHandler)))

		authPath, authHandler := thanawyv1connect.NewAuthServiceHandler(&internalgrpc.AuthConnectHandler{Svc: authSvc})
		api.Any(strings.TrimPrefix(authPath, "/")+"*action", gin.WrapH(http.StripPrefix("/api", authHandler)))

		analyticsPath, analyticsHandler := thanawyv1connect.NewAnalyticsServiceHandler(&internalgrpc.AnalyticsConnectHandler{Svc: analyticsSvc})
		api.Any(strings.TrimPrefix(analyticsPath, "/")+"*action", gin.WrapH(http.StripPrefix("/api", analyticsHandler)))

		auth := api.Group("/auth")
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
			auth.GET("/me", handlers.GetProfile)
			auth.GET("/sessions", handlers.GetAuthSessions)
			auth.DELETE("/sessions", handlers.DeleteAuthSession)
			auth.PATCH("/sessions", handlers.UpdateAuthSession)
			auth.GET("/security-logs", handlers.GetSecurityLogs)
		}

		// Public Course routes
		api.GET("/courses", handlers.GetSubjects)
		api.GET("/courses/:id", handlers.GetSubject)
		api.GET("/courses/:id/lessons", handlers.GetCourseLessons)
		api.GET("/courses/:id/reviews", handlers.GetCourseReviews)
		api.GET("/categories", handlers.GetCategories)
		api.GET("/courses/categories", handlers.GetCategories)
		api.GET("/teachers", handlers.GetTeachers)

		// Public Exam routes (read-only)
		api.GET("/exams", handlers.GetExams)

		// Activity routes moved to protected group

		// AI routes
		ai := api.Group("/ai")
		{
			ai.POST("/exam", handlers.AIExamProxy)
			ai.POST("/suggest", handlers.AISuggestProxy)
			ai.POST("/chat", handlers.AIChatProxy)
			ai.POST("/tips", handlers.AITipsProxy)
			ai.GET("/recommendations", handlers.GetAIRecommendations)
			ai.POST("/recommendations/track", handlers.TrackAIRecommendation)
		}

		// Guest User
		api.Any("/users/guest", handlers.GetGuestUser)

		// Paymob Webhook
		api.POST("/payments/paymob/callback", handlers.PaymobWebhook)
		api.GET("/payments/paymob/callback", handlers.PaymobWebhook) // Some providers might use GET for simple status

		// Clerk Webhook (no auth required - Clerk signs the webhook)
		api.POST("/webhooks/clerk", handlers.ClerkWebhook)

		// WebSocket
		api.GET("/ws", middleware.Auth(), handlers.WSHandler)

		// Public Library routes
		api.GET("/library/categories", handlers.GetLibraryCategories)

		// Protected routes
		protected := api.Group("/")
		protected.Use(middleware.Auth())
		{
			protected.GET("/progress/summary", handlers.GetProgressSummary)
			protected.GET("/analytics/weekly", handlers.GetWeeklyAnalytics)
			protected.GET("/analytics/time", handlers.GetTimeAnalytics)
			protected.GET("/analytics/performance", handlers.GetWeeklyAnalytics)
			protected.GET("/analytics/predictions", handlers.GetWeeklyAnalytics)
			protected.GET("/recommendations", handlers.GetAIRecommendations)

			// Protected Activity routes
			protected.GET("/schedule", handlers.GetSchedule)
			protected.GET("/tasks", handlers.GetTasks)
			protected.GET("/study-sessions", handlers.GetStudySessions)
			protected.GET("/reminders", handlers.GetReminders)
			protected.GET("/resources", func(c *gin.Context) {
				c.JSON(200, gin.H{"data": []interface{}{}, "success": true})
			})
			protected.POST("/schedule", handlers.UpdateSchedule)
			protected.POST("/tasks", handlers.CreateTask)
			protected.PATCH("/tasks/:id", handlers.UpdateTask)
			protected.PUT("/tasks/:id", handlers.UpdateTask)
			protected.DELETE("/tasks/:id", handlers.DeleteTask)
			protected.POST("/study-sessions", handlers.CreateStudySession)
			protected.POST("/reminders", handlers.CreateReminder)

			// Notifications
			protected.GET("/notifications", handlers.GetNotifications)
			protected.GET("/notifications/unread-count", handlers.GetUnreadNotificationsCount)
			protected.POST("/notifications/mark-read", handlers.MarkNotificationRead)

			// Settings
			protected.GET("/settings/preferences", handlers.GetSettings)
			protected.PATCH("/settings/preferences", handlers.UpdateSettings)

			// Profile
			protected.GET("/users/billing-summary", handlers.GetBillingSummary)
			protected.PATCH("/users/profile", handlers.UpdateProfile)

			// Activities
			protected.GET("/activities/recent", handlers.GetRecentActivities)
			protected.POST("/activities/:id/read", handlers.MarkActivityRead)
			protected.POST("/activities/read-all", handlers.MarkAllActivitiesRead)

			// Billing & Subscriptions
			protected.GET("/billing/wallet", handlers.GetWalletBalance)
			protected.POST("/billing/wallet", handlers.HandleWalletDeposit)
			protected.GET("/subscriptions/plans", handlers.GetSubscriptionPlans)
			protected.GET("/subscriptions/addons", handlers.GetSubscriptionAddons)
			protected.POST("/subscriptions/addons", handlers.PurchaseAddon)
			protected.POST("/subscriptions/checkout", handlers.SubscriptionCheckout)
			protected.POST("/coupons/validate", handlers.ValidateCoupon)

			// User Subjects
			protected.GET("/subjects", handlers.GetUserSubjects)

			// Search
			protected.GET("/search", handlers.GlobalSearch)
			protected.GET("/database-partitions", handlers.DatabasePartitions)
			protected.GET("/marketing", handlers.Marketing)
			protected.POST("/marketing", handlers.Marketing)
			protected.GET("/contests", handlers.Contests)
			protected.POST("/contests", handlers.Contests)
			protected.PATCH("/contests/:id", handlers.Contests)
			protected.DELETE("/contests/:id", handlers.Contests)

			// Library
			protected.GET("/library/books", handlers.GetLibraryBooks)
			protected.POST("/library/books", handlers.CreateLibraryBook)

			// Enrollment & Progress
			protected.POST("/courses/:id/enroll", handlers.EnrollCourse)
			protected.POST("/courses/:id/checkout", handlers.CourseCheckout)
			protected.GET("/courses/:id/curriculum", handlers.GetSubjectCurriculum)
			protected.POST("/courses/lessons/:id/progress", handlers.UpdateLessonProgress)

			// Lesson Notes & Reviews
			protected.GET("/courses/lessons/:id/notes", handlers.GetLessonNotes)
			protected.POST("/courses/lessons/:id/notes", handlers.CreateLessonNote)
			protected.POST("/courses/:id/reviews", handlers.CreateCourseReview)

			// Upload
			protected.POST("/upload", handlers.Upload)
			protected.Any("/upload/chunked", handlers.UploadChunked)

			// Exam routes
			protected.POST("/exams/:id/submit", handlers.SubmitExam)

			// Payment routes
			protected.POST("/payments/create", handlers.CreatePayment)
			protected.GET("/payments/history", handlers.GetPaymentHistory)

			// Admin routes
			admin := protected.Group("/admin")
			admin.Use(middleware.AdminRequired())
			admin.Use(middleware.AdminRateLimiter())
			{
				admin.GET("/dashboard", middleware.PermissionRequired(models.PermDashboardView), handlers.GetAdminDashboard)
				admin.GET("/live", middleware.PermissionRequired(models.PermLiveMonitorView), handlers.GetAdminLive)
				admin.GET("/analytics", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetAdminAnalytics)
				admin.GET("/infrastructure/stats", middleware.PermissionRequired(models.PermLiveMonitorView), handlers.GetAdminInfrastructureStats)
				admin.GET("/metrics/history", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetAdminMetricsHistory)
				admin.GET("/reports/overview", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsOverview)
				admin.GET("/reports/books", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsBooks)
				admin.GET("/reports/users", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsUsers)
				admin.GET("/announcements", middleware.PermissionRequired(models.PermAnnouncementsView), handlers.GetAdminAnnouncements)
				admin.GET("/users", middleware.PermissionRequired(models.PermUsersView), handlers.GetUsers)
				admin.GET("/users/:id", middleware.PermissionRequired(models.PermUsersView), handlers.GetUserByID)
				admin.POST("/users", middleware.PermissionRequired(models.PermUsersManage), handlers.CreateUser)
				admin.PATCH("/users", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateUser)
				admin.PATCH("/users/:id", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateUser)
				admin.DELETE("/users", middleware.PermissionRequired(models.PermUsersManage), handlers.DeleteUser)
				admin.DELETE("/users/:id", middleware.PermissionRequired(models.PermUsersManage), handlers.DeleteUser)
				admin.POST("/impersonate", handlers.ImpersonateUser)
				admin.DELETE("/impersonate", handlers.DeleteImpersonation)
				admin.POST("/users/bulk-send-message", handlers.AdminBulkSendMessage)
				admin.GET("/teachers", handlers.GetTeachers)
				admin.POST("/teachers", handlers.CreateTeacher)
				admin.PATCH("/teachers", handlers.UpdateTeacher)
				admin.DELETE("/teachers", handlers.DeleteTeacher)
				admin.GET("/subjects", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
				admin.GET("/subjects/:id", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubject)
				admin.POST("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateSubject)
				admin.PATCH("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateSubject)
				admin.DELETE("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)
				admin.GET("/courses", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
				admin.GET("/courses/export", handlers.AdminCourseAction)
				admin.GET("/courses/:id", handlers.GetSubject)
				admin.DELETE("/courses", handlers.DeleteSubject)
				admin.GET("/course-categories", handlers.GetCategories)
				admin.POST("/course-categories", handlers.CreateCategory)
				admin.PATCH("/course-categories", handlers.UpdateCategory)
				admin.DELETE("/course-categories", handlers.DeleteCategory)

				// Admin AI
				admin.GET("/ai", handlers.AdminAIGet)
				admin.POST("/ai", handlers.AdminAIPost)
				admin.POST("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.CreateAdminAnnouncement)
				admin.PATCH("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.UpdateAdminAnnouncement)
				admin.DELETE("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.DeleteAdminAnnouncement)

				// Admin Course Management
				admin.POST("/courses", handlers.CreateSubject)
				admin.PATCH("/courses", handlers.UpdateSubject)
				admin.DELETE("/courses/:id", handlers.DeleteSubject)
				admin.POST("/courses/duplicate", handlers.AdminCourseAction)
				admin.POST("/courses/batch", handlers.AdminCourseAction)
				admin.GET("/courses/:id/curriculum", handlers.GetSubjectCurriculum)
				admin.PATCH("/courses/:id/curriculum", handlers.UpdateCourseCurriculum)
				admin.PUT("/courses/:id/curriculum", handlers.UpdateCourseCurriculum)
				admin.POST("/courses/lessons/:id/attachments", handlers.AddLessonAttachment)
				admin.GET("/courses/:id/enrollments", handlers.GetCourseEnrollments)
				admin.POST("/courses/:id/enrollments", handlers.ManualEnroll)
				admin.DELETE("/courses/:id/enrollments/:userId", handlers.UnenrollUser)

				// Admin Exams
				admin.GET("/exams", middleware.PermissionRequired(models.PermExamsView), handlers.GetExams)
				admin.POST("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.CreateExam)
				admin.PATCH("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.UpdateExam)
				admin.DELETE("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.DeleteExam)
				admin.POST("/exams/bulk", middleware.PermissionRequired(models.PermExamsManage), handlers.AdminExamsBulkUpload)

				// Admin Payments & Revenue
				admin.GET("/payments", handlers.GetAdminPayments)
				admin.GET("/analytics/revenue", handlers.GetAdminRevenue)

				// Compatibility endpoints used by the admin frontend. These routes keep
				// pages reachable while each feature graduates to a dedicated data model.
				// Admin Gamification
				admin.GET("/achievements", middleware.PermissionRequired(models.PermAchievementsView), handlers.AdminGetAchievements)
				admin.POST("/achievements", middleware.PermissionRequired(models.PermAchievementsManage), handlers.AdminCreateAchievement)
				admin.PATCH("/achievements/:id", middleware.PermissionRequired(models.PermAchievementsManage), handlers.AdminUpdateAchievement)
				admin.DELETE("/achievements/:id", middleware.PermissionRequired(models.PermAchievementsManage), handlers.AdminDeleteAchievement)
				
				admin.GET("/rewards", middleware.PermissionRequired(models.PermRewardsView), handlers.AdminGetRewards)
				admin.POST("/rewards", middleware.PermissionRequired(models.PermRewardsManage), handlers.AdminCreateReward)
				admin.PATCH("/rewards/:id", middleware.PermissionRequired(models.PermRewardsManage), handlers.AdminUpdateReward)
				admin.DELETE("/rewards/:id", middleware.PermissionRequired(models.PermRewardsManage), handlers.AdminDeleteReward)
				
				admin.GET("/seasons", middleware.PermissionRequired(models.PermSeasonsView), handlers.AdminGetSeasons)
				admin.POST("/seasons", middleware.PermissionRequired(models.PermSeasonsManage), handlers.AdminCreateSeason)
				admin.PATCH("/seasons/:id", middleware.PermissionRequired(models.PermSeasonsManage), handlers.AdminUpdateSeason)
				admin.DELETE("/seasons/:id", middleware.PermissionRequired(models.PermSeasonsManage), handlers.AdminDeleteSeason)
				
				admin.GET("/challenges", middleware.PermissionRequired(models.PermChallengesView), handlers.AdminGetChallenges)
				admin.POST("/challenges", middleware.PermissionRequired(models.PermChallengesManage), handlers.AdminCreateChallenge)
				admin.PATCH("/challenges/:id", middleware.PermissionRequired(models.PermChallengesManage), handlers.AdminUpdateChallenge)
				admin.DELETE("/challenges/:id", middleware.PermissionRequired(models.PermChallengesManage), handlers.AdminDeleteChallenge)

				// Admin Marketing & Content
				admin.GET("/coupons", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminGetCoupons)
				admin.POST("/coupons", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminCreateCoupon)
				admin.PATCH("/coupons/:id", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminUpdateCoupon)
				admin.DELETE("/coupons/:id", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminDeleteCoupon)
				
				admin.GET("/blog", middleware.PermissionRequired(models.PermBlogView), handlers.AdminGetBlog)
				admin.POST("/blog", middleware.PermissionRequired(models.PermBlogManage), handlers.AdminCreateBlogPost)
				admin.PATCH("/blog/:id", middleware.PermissionRequired(models.PermBlogManage), handlers.AdminUpdateBlogPost)
				admin.DELETE("/blog/:id", middleware.PermissionRequired(models.PermBlogManage), handlers.AdminDeleteBlogPost)
				
				admin.GET("/forum", middleware.PermissionRequired(models.PermForumView), handlers.AdminGetForum)
				admin.GET("/forum-categories", middleware.PermissionRequired(models.PermForumView), handlers.AdminGetForumCategories)
				admin.POST("/forum-categories", middleware.PermissionRequired(models.PermForumManage), handlers.AdminCreateForumCategory)
				
				admin.GET("/events", middleware.PermissionRequired(models.PermEventsView), handlers.AdminGetEvents)
				admin.POST("/events", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminCreateEvent)
				admin.PATCH("/events/:id", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminUpdateEvent)
				admin.DELETE("/events/:id", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminDeleteEvent)
				
				admin.GET("/automations", middleware.PermissionRequired(models.PermAdminBypass), handlers.AdminGetAutomations) // No specific perm yet
				
				admin.GET("/ab-testing", middleware.PermissionRequired(models.PermAbTestingView), handlers.AdminGetABTests)
				
				admin.GET("/books", middleware.PermissionRequired(models.PermBooksView), handlers.AdminGetBooks)
				admin.POST("/books", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminCreateBook)
				admin.PATCH("/books/:id", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminUpdateBook)
				admin.DELETE("/books/:id", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminDeleteBook)

				// Admin Logs & Reporting
				admin.GET("/audit-logs", middleware.PermissionRequired(models.PermAuditLogsView), handlers.AdminGetAuditLogs)
				admin.Any("/reports/content", handlers.AdminReportsContent)
				admin.Any("/books/reviews", handlers.AdminBookReviews)
				admin.Any("/books/views", handlers.AdminBookReviews)
				admin.Any("/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.AdminSettings)
				admin.Any("/resources", middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminCollection("resources"))
			}
		}
	}

	// Start gRPC Server
	go func() {
		grpcPort := os.Getenv("GRPC_PORT")
		if grpcPort == "" {
			grpcPort = "50051"
		}
		lis, err := net.Listen("tcp", ":"+grpcPort)
		if err != nil {
			log.Printf("Failed to listen for gRPC: %v", err)
			return
		}
		s := grpc.NewServer()
		thanawyv1.RegisterCourseServiceServer(s, courseSvc)
		thanawyv1.RegisterAuthServiceServer(s, authSvc)
		thanawyv1.RegisterAnalyticsServiceServer(s, analyticsSvc)

		// Register reflection service on gRPC server
		reflection.Register(s)

		log.Printf("gRPC server listening on port %s", grpcPort)
		if err := s.Serve(lis); err != nil {
			log.Printf("Failed to serve gRPC: %v", err)
		}
	}()

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
