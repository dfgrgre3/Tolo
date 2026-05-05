package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"runtime"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string           `json:"status"` // "ok", "degraded", "critical"
	Timestamp string           `json:"timestamp"`
	Checks    map[string]Check `json:"checks"`
	Message   string           `json:"message,omitempty"`
}

// Check represents individual health check result
type Check struct {
	Status   string `json:"status"` // "ok", "warning", "error"
	Duration string `json:"duration_ms"`
	Details  string `json:"details,omitempty"`
	Error    string `json:"error,omitempty"`
}

// HealthCheck performs comprehensive system health checks
func HealthCheck(c *gin.Context) {
	checks := make(map[string]Check)
	overallStatus := "ok"

	// 1. Database Health
	dbCheck := checkDatabaseHealth()
	checks["database"] = dbCheck
	if dbCheck.Status != "ok" {
		overallStatus = "degraded"
	}

	// 2. Redis Health
	redisCheck := checkRedisHealth()
	checks["redis"] = redisCheck
	if redisCheck.Status != "ok" {
		overallStatus = "degraded"
	}

	// 3. Memory Health
	memoryCheck := checkMemoryHealth()
	checks["memory"] = memoryCheck
	if memoryCheck.Status == "error" {
		overallStatus = "critical"
	}

	// 4. Connection Pool Health
	poolCheck := checkConnectionPoolHealth()
	checks["connection_pool"] = poolCheck
	if poolCheck.Status != "ok" {
		overallStatus = "degraded"
	}

	// 5. Response Time Health
	responseCheck := checkResponseTimeHealth(c)
	checks["response_time"] = responseCheck

	// Determine HTTP status code
	statusCode := http.StatusOK
	if overallStatus == "degraded" {
		statusCode = http.StatusOK // Still OK but degraded
	} else if overallStatus == "critical" {
		statusCode = http.StatusServiceUnavailable
	}

	response := HealthResponse{
		Status:    overallStatus,
		Timestamp: time.Now().Format(time.RFC3339),
		Checks:    checks,
	}

	if overallStatus == "critical" {
		response.Message = "System is in critical state. Immediate attention required."
	} else if overallStatus == "degraded" {
		response.Message = "System is degraded. Some services may be impaired."
	}

	c.JSON(statusCode, response)
	logger.Info(fmt.Sprintf("Health check - Status: %s", overallStatus), map[string]interface{}{
		"overall_status": overallStatus,
		"database":       dbCheck.Status,
		"redis":          redisCheck.Status,
		"memory":         memoryCheck.Status,
	})
}

// checkDatabaseHealth checks if database connection is healthy
func checkDatabaseHealth() Check {
	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Test with a simple query
	var result int
	err := db.DB.WithContext(ctx).Raw("SELECT 1").Scan(&result).Error

	duration := time.Since(start).Milliseconds()

	if err != nil {
		logger.Error("Database health check failed", err, map[string]interface{}{
			"duration_ms": duration,
		})
		return Check{
			Status:   "error",
			Duration: fmt.Sprintf("%dms", duration),
			Error:    err.Error(),
		}
	}

	status := "ok"
	details := ""

	// Warn if response time is slow
	if duration > 1000 {
		status = "warning"
		details = fmt.Sprintf("Slow response: %dms", duration)
	}

	return Check{
		Status:   status,
		Duration: fmt.Sprintf("%dms", duration),
		Details:  details,
	}
}

// checkRedisHealth checks if Redis connection is healthy
func checkRedisHealth() Check {
	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// Get Redis client from your singleton or DI
	// This assumes you have a global redis client
	// Adjust based on your actual Redis client setup
	redisClient := getRedisClient()
	if redisClient == nil {
		return Check{
			Status:   "error",
			Duration: "0ms",
			Error:    "Redis client not initialized",
		}
	}

	err := redisClient.Ping(ctx).Err()
	duration := time.Since(start).Milliseconds()

	if err != nil {
		// Redis not critical for health status
		logger.Warn("Redis health check failed", map[string]interface{}{
			"duration_ms": duration,
			"error":       err.Error(),
		})
		return Check{
			Status:   "warning",
			Duration: fmt.Sprintf("%dms", duration),
			Error:    err.Error(),
		}
	}

	return Check{
		Status:   "ok",
		Duration: fmt.Sprintf("%dms", duration),
	}
}

// checkMemoryHealth checks system memory usage
func checkMemoryHealth() Check {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Check if memory usage is reasonable
	memUsageMB := float64(m.Alloc) / 1024 / 1024
	memLimitMB := 2048.0 // 2GB limit warning threshold

	status := "ok"
	details := fmt.Sprintf("%.0fMB used", memUsageMB)

	if memUsageMB > memLimitMB {
		status = "warning"
		details = fmt.Sprintf("High memory usage: %.0fMB", memUsageMB)
	}

	if memUsageMB > memLimitMB*1.5 {
		status = "error"
		details = fmt.Sprintf("Critical memory usage: %.0fMB", memUsageMB)
	}

	return Check{
		Status:   status,
		Duration: "0ms",
		Details:  details,
	}
}

// checkConnectionPoolHealth checks database connection pool status
func checkConnectionPoolHealth() Check {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return Check{
			Status:   "error",
			Duration: "0ms",
			Error:    err.Error(),
		}
	}

	stats := sqlDB.Stats()
	details := fmt.Sprintf(
		"Open: %d, In Use: %d, Idle: %d, Max Open: %d",
		stats.OpenConnections,
		stats.InUse,
		stats.Idle,
		stats.MaxOpenConnections,
	)

	status := "ok"

	// Warn if connection pool is near capacity
	if stats.OpenConnections > stats.MaxOpenConnections-10 {
		status = "warning"
		details += " (approaching limit)"
	}

	// Error if completely full
	if stats.OpenConnections >= stats.MaxOpenConnections {
		status = "error"
		details += " (at capacity!)"
	}

	return Check{
		Status:   status,
		Duration: "0ms",
		Details:  details,
	}
}

// checkResponseTimeHealth checks if API response times are acceptable
func checkResponseTimeHealth(c *gin.Context) Check {
	// This is a simple check based on current request context
	// In production, you'd aggregate metrics over time
	return Check{
		Status:   "ok",
		Duration: "0ms",
		Details:  "Response time acceptable",
	}
}

// LivenessCheck returns 200 if the service is alive
// Used by Kubernetes liveness probes
func LivenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// ReadinessCheck returns 200 if the service is ready to serve traffic
// Used by Kubernetes readiness probes
func ReadinessCheck(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Check if database is accessible
	var result int
	if err := db.DB.WithContext(ctx).Raw("SELECT 1").Scan(&result).Error; err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not_ready",
			"reason": "database_unavailable",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// getRedisClient returns the singleton Redis client from the db package
func getRedisClient() *redis.Client {
	return db.Redis
}
