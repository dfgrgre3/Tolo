package main

// @title Thanawy API
// @version 1.0
// @description This is the API server for the Thanawy platform.
// @host localhost:8082
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/router"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	internalgrpc "thanawy-backend/internal/api/grpc"
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"
	thanawyv1 "thanawy-backend/internal/proto/thanawy/v1"

	_ "thanawy-backend/docs"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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

	// SQL migrations are the only supported production schema-change path.
	// In production, run them from a single release job with RUN_DB_MIGRATIONS=true.
	// In non-production, they run by default before the optional development AutoMigrate path.
	runMigrations := os.Getenv("RUN_DB_MIGRATIONS")
	if runMigrations == "true" || (runMigrations == "" && cfg.Environment != "production") {
		log.Println("Checking/Applying SQL database migrations...")
		if err := db.RunSQLMigrations(database); err != nil {
			log.Printf("CRITICAL: SQL migrations failed: %v", err)
			log.Println("The application cannot start with failed migrations.")
			// ALWAYS fail fast - inconsistent schema causes data corruption
			log.Fatal("Migration failure - aborting startup")
		}
		log.Println("SQL database migrations applied successfully.")

		// Seed AFTER SQL migrations to ensure all tables exist
		if err := db.Seed(); err != nil {
			log.Printf("Seeding failed: %v", err)
		}
		log.Println("Database seeded successfully.")
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
	if os.Getenv("GIN_MODE") == "release" || cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()

	// Apply Middlewares
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.PerformanceMonitor())
	// router.Use(middleware.RateLimiter(200, time.Minute)) // This was invalid
	r.Use(middleware.CSRFMiddleware())

	// Serve static files for uploads
	r.Static("/uploads", "./uploads")

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})
	r.GET("/api/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/api/readyz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ready"})
	})

	// Swagger documentation
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Setup route groups
	router.SetupAuthRoutes(r)
	router.SetupPublicRoutes(r)
	router.SetupProtectedRoutes(r)
	router.SetupAdminRoutes(r)

	// Start gRPC Server
	var grpcServer *grpc.Server
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
		grpcServer = grpc.NewServer()
		thanawyv1.RegisterCourseServiceServer(grpcServer, courseSvc)
		thanawyv1.RegisterAuthServiceServer(grpcServer, authSvc)
		thanawyv1.RegisterAnalyticsServiceServer(grpcServer, analyticsSvc)

		// Register reflection service on gRPC server
		reflection.Register(grpcServer)

		log.Printf("gRPC server listening on port %s", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Printf("Failed to serve gRPC: %v", err)
		}
	}()

	// Start HTTP Server with graceful shutdown
	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = os.Getenv("PORT")
	}

	// If port is 3000, it's likely picking up the Next.js PORT from root .env
	// We fallback to 8082 to avoid the "address already in use" conflict.
	if port == "" || port == "3000" {
		port = "8082"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Run server in goroutine
	go func() {
		log.Printf("HTTP server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown HTTP server
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("HTTP server forced to shutdown: %v", err)
	}

	// Shutdown gRPC server if exists
	if grpcServer != nil {
		log.Println("Shutting down gRPC server...")
		grpcServer.GracefulStop()
	}

	log.Println("Server exited")
}
