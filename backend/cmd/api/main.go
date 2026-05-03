package main

import (
	"context"
	"log"
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
	r := gin.Default()

	// Apply Middlewares
	r.Use(middleware.CORS())
	r.Use(gin.Recovery())
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
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:   10 * time.Second,
		WriteTimeout:  30 * time.Second,
		IdleTimeout:   120 * time.Second,
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
