package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"strings"

	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"

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
	_, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations with distributed lock to prevent race conditions in Kubernetes
	if err := db.MigrateWithLock(); err != nil {
		log.Printf("Migration failed: %v", err)
	}
	log.Println("Database schema synced.")

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
	router.Use(middleware.StructuredLogger())

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
			auth.POST("/register", handlers.Register)
			auth.POST("/logout", handlers.Logout)

			// Protected auth routes
			auth.Use(middleware.Auth())
			auth.GET("/me", handlers.GetProfile)
			auth.GET("/sessions", handlers.GetAuthSessions)
			auth.DELETE("/sessions", handlers.DeleteAuthSession)
			auth.PATCH("/sessions", handlers.UpdateAuthSession)
			auth.GET("/security-logs", handlers.GetSecurityLogs)
			auth.POST("/refresh", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"success": true})
			})
			auth.POST("/2fa/verify", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"success": true})
			})
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
			protected.GET("/subscriptions/plans", handlers.GetSubscriptionPlans)
			protected.GET("/subscriptions/addons", handlers.GetSubscriptionAddons)
			protected.POST("/subscriptions/addons", handlers.PurchaseAddon)
			protected.POST("/subscriptions/checkout", handlers.SubscriptionCheckout)
			protected.POST("/coupons/validate", handlers.ValidateCoupon)

			// User Subjects
			protected.GET("/subjects", handlers.GetUserSubjects)

			// Search
			protected.GET("/search", handlers.GlobalSearch)

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
			protected.POST("/upload/chunked", handlers.UploadChunked)

			// Exam routes
			protected.POST("/exams/:id/submit", handlers.SubmitExam)

			// Payment routes
			protected.POST("/payments/create", handlers.CreatePayment)
			protected.GET("/payments/history", handlers.GetPaymentHistory)

			// Admin routes
			admin := protected.Group("/admin")
			admin.Use(middleware.AdminRequired())
			{
				admin.GET("/dashboard", handlers.GetAdminDashboard)
				admin.GET("/live", handlers.GetAdminLive)
				admin.GET("/analytics", handlers.GetAdminAnalytics)
				admin.GET("/infrastructure/stats", handlers.GetAdminInfrastructureStats)
				admin.GET("/metrics/history", handlers.GetAdminMetricsHistory)
				admin.GET("/reports/overview", handlers.GetAdminReportsOverview)
				admin.GET("/reports/books", handlers.GetAdminReportsBooks)
				admin.GET("/reports/users", handlers.GetAdminReportsUsers)
				admin.GET("/announcements", handlers.GetAdminAnnouncements)
				admin.GET("/users", handlers.GetUsers)
				admin.GET("/users/:id", handlers.GetUserByID)
				admin.POST("/users", handlers.CreateUser)
				admin.PATCH("/users", handlers.UpdateUser)
				admin.PATCH("/users/:id", handlers.UpdateUser)
				admin.DELETE("/users", handlers.DeleteUser)
				admin.DELETE("/users/:id", handlers.DeleteUser)
				admin.POST("/impersonate", handlers.ImpersonateUser)
				admin.DELETE("/impersonate", handlers.DeleteImpersonation)
				admin.POST("/users/bulk-send-message", handlers.AdminBulkSendMessage)
				admin.GET("/teachers", handlers.GetTeachers)
				admin.POST("/teachers", handlers.CreateTeacher)
				admin.PATCH("/teachers", handlers.UpdateTeacher)
				admin.DELETE("/teachers", handlers.DeleteTeacher)
				admin.GET("/subjects", handlers.GetSubjects)
				admin.GET("/subjects/:id", handlers.GetSubject)
				admin.POST("/subjects", handlers.CreateSubject)
				admin.PATCH("/subjects", handlers.UpdateSubject)
				admin.DELETE("/subjects", handlers.DeleteSubject)
				admin.GET("/courses", handlers.GetSubjects)
				admin.GET("/courses/:id", handlers.GetSubject)
				admin.DELETE("/courses", handlers.DeleteSubject)
				admin.GET("/course-categories", handlers.GetCategories)
				admin.POST("/course-categories", handlers.CreateCategory)
				admin.PATCH("/course-categories", handlers.UpdateCategory)
				admin.DELETE("/course-categories", handlers.DeleteCategory)

				// Admin AI
				admin.GET("/ai", handlers.AdminAIGet)
				admin.POST("/ai", handlers.AdminAIPost)
				admin.POST("/announcements", handlers.CreateAdminAnnouncement)
				admin.PATCH("/announcements", handlers.UpdateAdminAnnouncement)
				admin.DELETE("/announcements", handlers.DeleteAdminAnnouncement)

				// Admin Course Management
				admin.POST("/courses", handlers.CreateSubject)
				admin.PATCH("/courses", handlers.UpdateSubject)
				admin.DELETE("/courses/:id", handlers.DeleteSubject)
				admin.GET("/courses/:id/curriculum", handlers.GetSubjectCurriculum)
				admin.PATCH("/courses/:id/curriculum", handlers.UpdateCourseCurriculum)
				admin.POST("/courses/lessons/:id/attachments", handlers.AddLessonAttachment)

				// Admin Exams
				admin.GET("/exams", handlers.GetExams)
				admin.POST("/exams", handlers.CreateExam)
				admin.PATCH("/exams", handlers.UpdateExam)
				admin.DELETE("/exams", handlers.DeleteExam)
				admin.POST("/exams/bulk", handlers.AdminExamsBulkUpload)

				// Admin Payments & Revenue
				admin.GET("/payments", handlers.GetAdminPayments)
				admin.GET("/analytics/revenue", handlers.GetAdminRevenue)
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