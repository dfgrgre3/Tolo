package main

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

	// Run SQL Migrations FIRST to fix any schema issues (missing columns, tables, etc.)
	// This must run before AutoMigrate to ensure schema is in valid state.
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
	}

	// Schema changes must be explicit. AutoMigrate is unsafe during multi-instance rollouts.
	// Run AFTER SQL migrations to create any new tables that don't exist yet.
	autoMigrate := os.Getenv("DB_AUTO_MIGRATE")
	if autoMigrate == "true" || (autoMigrate == "" && cfg.Environment != "production") {
		if cfg.Environment == "production" && autoMigrate == "true" {
			log.Fatal("DB_AUTO_MIGRATE=true is not allowed in production; use RUN_DB_MIGRATIONS=true from a single release job")
		}
		if err := db.MigrateWithLock(); err != nil {
			log.Printf("AutoMigrate failed: %v", err)
		}
		// Seed AFTER both SQL migrations and AutoMigrate to ensure all tables exist
		if err := db.Seed(); err != nil {
			log.Printf("Seeding failed: %v", err)
		}
		log.Println("Development database schema synced and seeded.")
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
