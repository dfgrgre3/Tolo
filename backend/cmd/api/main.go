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
	"thanawy-backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	internalgrpc "thanawy-backend/internal/api/grpc"
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"
	thanawyv1 "thanawy-backend/internal/proto/thanawy/v1"
	"thanawy-backend/internal/worker"

	_ "thanawy-backend/docs" // Required for Swagger documentation generation

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
	config.GlobalConfig = cfg

	// Initialize Database
	_, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize Storage
	initStorage(cfg)

	// SQL migrations and seeding are now handled by a separate process (cmd/migrate/main.go)
	// to avoid race conditions in distributed environments.

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
	r := setupRouter(cfg)

	// Start gRPC Server
	grpcServer := startGRPCServer(courseSvc, authSvc, analyticsSvc)


	// Start Background Worker
	go func() {
		log.Println("Starting background worker...")
		worker.StartWorker()
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

func initStorage(cfg *config.Config) {
	if cfg.StorageType == "s3" {
		storageSvc, err := storage.NewS3Storage(
			cfg.S3.Endpoint,
			cfg.S3.AccessKey,
			cfg.S3.SecretKey,
			cfg.S3.Bucket,
			cfg.S3.Region,
			cfg.S3.UseSSL,
			cfg.S3.PublicURL,
		)
		if err != nil {
			log.Fatalf("Failed to initialize S3 storage: %v", err)
		}
		storage.GlobalStorage = storageSvc
		log.Println("Storage initialized with S3 provider")
	} else {
		storage.GlobalStorage = storage.NewLocalStorage(
			cfg.LocalStorage.BasePath,
			cfg.LocalStorage.BaseURL,
		)
		log.Println("Storage initialized with Local provider")
	}
}

func setupRouter(cfg *config.Config) *gin.Engine {
	if os.Getenv("GIN_MODE") == "release" || cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()

	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.PerformanceMonitor())
	r.Use(middleware.GlobalRateLimiter(200, time.Minute))
	r.Use(middleware.CSRFMiddleware())
	r.Use(middleware.DBConsistencyMiddleware(db.DB))

	if cfg.StorageType == "local" {
		r.Static("/uploads", cfg.LocalStorage.BasePath)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})
	r.GET("/api/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/api/readyz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ready"})
	})

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.SetupAuthRoutes(r)
	router.SetupPublicRoutes(r)
	router.SetupProtectedRoutes(r)
	router.SetupAdminRoutes(r)

	return r
}

func startGRPCServer(courseSvc *internalgrpc.CourseServiceServer, authSvc *internalgrpc.AuthServiceServer, analyticsSvc *internalgrpc.AnalyticsServiceServer) *grpc.Server {
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "50051"
	}
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Printf("Failed to listen for gRPC: %v", err)
		return nil
	}
	grpcServer := grpc.NewServer()
	thanawyv1.RegisterCourseServiceServer(grpcServer, courseSvc)
	thanawyv1.RegisterAuthServiceServer(grpcServer, authSvc)
	thanawyv1.RegisterAnalyticsServiceServer(grpcServer, analyticsSvc)

	reflection.Register(grpcServer)

	log.Printf("gRPC server listening on port %s", grpcPort)
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			log.Printf("Failed to serve gRPC: %v", err)
		}
	}()
	return grpcServer
}
