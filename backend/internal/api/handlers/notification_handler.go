package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/worker"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── in-process L1 cache for notifications ──────────────────────────
type notifL1Entry struct {
	data      []byte
	expiresAt time.Time
}

var (
	notificationsL1    sync.Map // key: string → *notifL1Entry
	notificationsL1TTL = 20 * time.Second
)

func GetNotifications(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var notifications []models.Notification

	// ── L1 in-process cache (first page only) ───────────────────────
	useL1 := offset == 0 && limit <= 20
	l1Key := fmt.Sprintf("notif:%s:%d", userId, limit)
	if useL1 {
		if raw, ok := notificationsL1.Load(l1Key); ok {
			entry := raw.(*notifL1Entry)
			if time.Now().Before(entry.expiresAt) {
				if json.Unmarshal(entry.data, &notifications) == nil {
					c.JSON(http.StatusOK, notifications)
					return
				}
			}
		}
	}

	// ── L2 Redis cache (first page only) ─────────────────────────────
	redisKey := fmt.Sprintf("notifications:%s:%d", userId, limit)
	if db.Redis != nil && offset == 0 {
		redisCtx, cancel := context.WithTimeout(c.Request.Context(), 200*time.Millisecond)
		cachedVal, err := db.Redis.Get(redisCtx, redisKey).Result()
		cancel()
		if err == nil {
			if json.Unmarshal([]byte(cachedVal), &notifications) == nil {
				// Warm L1 from Redis hit
				if useL1 {
					notificationsL1.Store(l1Key, &notifL1Entry{data: []byte(cachedVal), expiresAt: time.Now().Add(notificationsL1TTL)})
				}
				c.JSON(http.StatusOK, notifications)
				return
			}
		}
	}

	// ── Database query (covering index) ──────────────────────────────
	readDB := db.ReadDB()
	if readDB == nil {
		readDB = db.DB
	}
	if err := readDB.Select("id", "title", "message", "type", "is_read", "created_at", "link", "icon").
		Where("user_id = ?", userId).
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	// ── Populate caches for first-page results ──────────────────────
	if offset == 0 && len(notifications) > 0 {
		if cachedData, err := json.Marshal(notifications); err == nil {
			// L2: Redis with 15-second TTL (Asynchronous)
			if db.Redis != nil {
				go func(key string, val []byte) {
					writeCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
					defer cancel()
					db.Redis.Set(writeCtx, key, val, 30*time.Second)
				}(redisKey, cachedData)
			}
			// L1: in-process
			if useL1 {
				notificationsL1.Store(l1Key, &notifL1Entry{data: cachedData, expiresAt: time.Now().Add(notificationsL1TTL)})
			}
		}
	}

	c.JSON(http.StatusOK, notifications)
}

func MarkNotificationRead(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ID != "" {
		// Mark specific notification as read
		if err := db.DB.Model(&models.Notification{}).Where("id = ? AND user_id = ?", req.ID, userId).Update("is_read", true).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
			return
		}
	} else {
		// Mark all as read
		if err := db.DB.Model(&models.Notification{}).Where("user_id = ?", userId).Update("is_read", true).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notifications"})
			return
		}
	}

	// Invalidate all notification/activity caches for this user
	notificationsL1.Delete(fmt.Sprintf("notif:%s:%d", userId, 10))
	notificationsL1.Delete(fmt.Sprintf("notif:%s:%d", userId, 20))
	activitiesL1.Delete(fmt.Sprintf("ra:%s:%d", userId, 10))
	activitiesL1.Delete(fmt.Sprintf("ra:%s:%d", userId, 20))
	unreadCountL1.Delete(fmt.Sprintf("unc:%s", userId))
	if db.Redis != nil {
		db.Redis.Del(c.Request.Context(), fmt.Sprintf("notifications:%s:%d", userId, 10))
		db.Redis.Del(c.Request.Context(), fmt.Sprintf("notifications:%s:%d", userId, 20))
		db.Redis.Del(c.Request.Context(), fmt.Sprintf("recent_activities:%s:%d", userId, 10))
		db.Redis.Del(c.Request.Context(), fmt.Sprintf("recent_activities:%s:%d", userId, 20))
		db.Redis.Del(c.Request.Context(), fmt.Sprintf("unread_notif_count:%s", userId))
	}

	// Notify via WebSocket to refresh notifications
	refreshMsg, _ := json.Marshal(gin.H{"type": "refresh_notifications"})
	GlobalHub.NotifyUser(userId.(string), refreshMsg)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func CreateNotificationTask(c *gin.Context) {
	var req worker.NotificationPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := worker.EnqueueNotification(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enqueue notification"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"status": "Notification enqueued"})
}
