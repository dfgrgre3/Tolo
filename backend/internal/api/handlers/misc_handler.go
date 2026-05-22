package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strconv"
	"strings"
	"sync"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── in-process L1 cache for recent-activities ────────────────────────────────
// Keeps a small in-memory snapshot so that short-burst repeated requests
// (e.g. React StrictMode double-render, rapid page navigations) never hit
// the remote Redis or the database at all.
type l1Entry struct {
	data      []byte
	expiresAt time.Time
}

var (
	activitiesL1    sync.Map           // key: string → *l1Entry
	activitiesL1TTL = 20 * time.Second // same tenant sees fresh data within 20 s
)

// ─── in-process L1 cache for unread notifications count ──────────
type unreadCountL1Entry struct {
	count     int64
	expiresAt time.Time
}

var (
	unreadCountL1    sync.Map
	unreadCountL1TTL = 20 * time.Second
)

func GetUnreadNotificationsCount(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// L1 in-process cache (zero network hop)
	l1Key := fmt.Sprintf("unc:%s", userId)
	if raw, ok := unreadCountL1.Load(l1Key); ok {
		entry := raw.(*unreadCountL1Entry)
		if time.Now().Before(entry.expiresAt) {
			api_response.Success(c, gin.H{"count": entry.count})
			return
		}
	}

	// L2 Redis cache
	if db.Redis != nil {
		cacheKey := fmt.Sprintf("unread_notif_count:%s", userId)
		redisCtx, cancel := context.WithTimeout(c.Request.Context(), 200*time.Millisecond)
		cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Int()
		cancel()
		if err == nil {
			count := int64(cachedVal)
			// Warm L1
			unreadCountL1.Store(l1Key, &unreadCountL1Entry{count: count, expiresAt: time.Now().Add(unreadCountL1TTL)})
			api_response.Success(c, gin.H{"count": count})
			return
		}
	}

	var count int64
	readDB := db.ReadDB()
	if readDB == nil {
		readDB = db.DB
	}
	if err := readDB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userId, false).
		Count(&count).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to count notifications")
		return
	}

	// Populate both caches
	if db.Redis != nil {
		go func(userId string, count int64) {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			db.Redis.Set(ctx, fmt.Sprintf("unread_notif_count:%s", userId), count, time.Minute)
		}(userId.(string), count)
	}
	unreadCountL1.Store(l1Key, &unreadCountL1Entry{count: count, expiresAt: time.Now().Add(unreadCountL1TTL)})

	api_response.Success(c, gin.H{"count": count})
}

func GetRecentActivities(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// ── pagination params ────────────────────────────────────────────────────
	limit := 10
	offset := 0
	if v, err := strconv.Atoi(c.DefaultQuery("limit", "10")); err == nil && v > 0 {
		if v > 20 {
			v = 20 // hard cap – prevents heavy scans
		}
		limit = v
	}
	if v, err := strconv.Atoi(c.DefaultQuery("offset", "0")); err == nil && v >= 0 {
		offset = v
	}

	var notifications []models.Notification

	// ── L1 in-process cache (first page only) ────────────────────────────────
	// Skipping L1 for paginated requests keeps subsequent pages fresh.
	useL1 := offset == 0 && limit <= 10
	l1Key := fmt.Sprintf("ra:%s:%d", userId, limit)
	if useL1 {
		if raw, ok := activitiesL1.Load(l1Key); ok {
			entry := raw.(*l1Entry)
			if time.Now().Before(entry.expiresAt) {
				if json.Unmarshal(entry.data, &notifications) == nil {
					api_response.Success(c, gin.H{"activities": buildActivitiesResponse(notifications)})
					return
				}
			}
		}
	}

	// ── L2 Redis cache (first page only) ────────────────────────────────────
	redisKey := fmt.Sprintf("recent_activities:%s:%d", userId, limit)
	if db.Redis != nil && offset == 0 {
		redisCtx, cancel := context.WithTimeout(c.Request.Context(), 200*time.Millisecond)
		cachedVal, err := db.Redis.Get(redisCtx, redisKey).Result()
		cancel()
		if err == nil {
			if json.Unmarshal([]byte(cachedVal), &notifications) == nil {
				// Warm L1 from Redis hit so next request is pure in-memory
				if useL1 {
					activitiesL1.Store(l1Key, &l1Entry{data: []byte(cachedVal), expiresAt: time.Now().Add(activitiesL1TTL)})
				}
				api_response.Success(c, gin.H{"activities": buildActivitiesResponse(notifications)})
				return
			}
		}
	}

	// ── Database query (covering index: user_id, created_at DESC INCLUDE ...) ─
	// idx_notifications_user_created_covering satisfies this query with an
	// Index Only Scan – no heap fetch required.
	readDB := db.ReadDB()
	if readDB == nil {
		readDB = db.DB
	}
	if err := readDB.
		Select("id", "title", "message", "type", "is_read", "created_at").
		Where("user_id = ?", userId).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch activities")
		return
	}

	// ── Populate caches for first-page results ───────────────────────────────
	if offset == 0 && len(notifications) > 0 {
		if cachedData, err := json.Marshal(notifications); err == nil {
			// L2: Redis with 60-second TTL
			if db.Redis != nil {
				go func(redisKey string, cachedData []byte) {
					ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
					defer cancel()
					db.Redis.Set(ctx, redisKey, cachedData, 60*time.Second)
				}(redisKey, cachedData)
			}
			// L1: in-process
			if useL1 {
				activitiesL1.Store(l1Key, &l1Entry{data: cachedData, expiresAt: time.Now().Add(activitiesL1TTL)})
			}
		}
	}

	api_response.Success(c, gin.H{"activities": buildActivitiesResponse(notifications)})
}

// buildActivitiesResponse converts notifications to activity format
func buildActivitiesResponse(notifications []models.Notification) []gin.H {
	activities := make([]gin.H, 0, len(notifications))
	for _, n := range notifications {
		activities = append(activities, gin.H{
			"id":          n.ID,
			"type":        strings.ToLower(string(n.Type)),
			"title":       n.Title,
			"description": n.Message,
			"timestamp":   n.CreatedAt,
			"read":        n.IsRead,
		})
	}
	return activities
}

func GetWalletBalance(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "User not found")
		return
	}

	var transactions []models.WalletTransaction
	db.DB.Where("user_id = ?", userId).Order("created_at desc").Limit(20).Find(&transactions)

	api_response.Success(c, gin.H{
		"balance":      user.Balance,
		"currency":     "EGP",
		"transactions": transactions,
		"history":      transactions, // For compatibility with different frontend versions
	})
}

// GetSubscriptionPlans is defined in subscription_handler.go
// This file now delegates to that implementation

func GlobalSearch(c *gin.Context) {
	api_response.Success(c, gin.H{
		"results": []interface{}{},
	})
}

func GetLibraryBooks(c *gin.Context) {
	api_response.Success(c, gin.H{
		"books": []interface{}{},
	})
}

func GetLessonNotes(c *gin.Context) {
	api_response.Success(c, gin.H{
		"notes": []interface{}{},
	})
}

func CreateLessonNote(c *gin.Context) {
	api_response.Created(c, gin.H{"success": true})
}

func ImpersonateUser(c *gin.Context) {
	var req struct {
		TargetUserID string `json:"targetUserId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid request")
		return
	}

	// Verify target user exists
	var user models.User
	if err := db.DB.First(&user, "id = ?", req.TargetUserID).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "User not found")
		return
	}

	// Set impersonation cookie
	// In a real app, this should be a signed cookie or stored in a session
	c.SetCookie("impersonate_user_id", req.TargetUserID, 3600, "/", "", isProduction(), true)

	api_response.Success(c, gin.H{
		"success": true,
		"message": fmt.Sprintf("أنت الآن تنتحل شخصية %s", user.Email),
	})
}

func GetAdminMetricsHistory(c *gin.Context) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	sqlDB, err := db.DB.DB()
	var dbOpenConns int
	if err == nil {
		stats := sqlDB.Stats()
		dbOpenConns = stats.OpenConnections
	}

	metrics := []gin.H{
		{
			"timestamp": time.Now().UnixMilli(),
			"type":      "memory",
			"value":     m.Alloc / 1024 / 1024, // MB
		},
		{
			"timestamp": time.Now().UnixMilli(),
			"type":      "goroutines",
			"value":     runtime.NumGoroutine(),
		},
		{
			"timestamp": time.Now().UnixMilli(),
			"type":      "db_connections",
			"value":     dbOpenConns,
		},
	}

	stats := gin.H{
		"memoryTotal":         m.TotalAlloc / 1024 / 1024,
		"memorySys":           m.Sys / 1024 / 1024,
		"numCPU":              runtime.NumCPU(),
		"dbOpenConnections":   dbOpenConns,
		"averageResponseTime": 120,
		"errorRate":           0.01,
	}

	api_response.Success(c, gin.H{
		"metrics": metrics,
		"stats":   stats,
	})
}

func formatMiB(value uint64) string {
	return fmt.Sprintf("%d MiB", value/1024/1024)
}
