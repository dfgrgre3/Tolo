package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/events"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const analyticsStream = "analytics:events"
const analyticsMaxLen = 10000

// IngestEvent is a lightweight REST endpoint that receives analytics events
// from the frontend and pushes them directly to a Redis Stream.
// No DB writes, no business logic — just fire-and-forget ingestion.
func IngestEvent(c *gin.Context) {
	var raw json.RawMessage
	if err := c.ShouldBindJSON(&raw); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event payload"})
		return
	}

	// Extract type and userId minimally for validation
	var header struct {
		ID     string          `json:"id"`
		Type   events.EventType `json:"type"`
		UserID string          `json:"userId"`
	}
	if err := json.Unmarshal(raw, &header); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid event structure"})
		return
	}

	if header.Type == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event type is required"})
		return
	}

	if header.ID == "" {
		header.ID = uuid.New().String()
	}

	event := events.AnalyticsEvent{
		ID:        header.ID,
		Type:      header.Type,
		UserID:    header.UserID,
		Timestamp: time.Now().UnixMilli(),
		Payload:   raw,
	}

	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("[EventIngest] Failed to marshal event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process event"})
		return
	}

	if db.Redis == nil {
		log.Printf("[EventIngest] Redis not available; dropping event type=%s id=%s", header.Type, header.ID)
		c.Status(http.StatusAccepted)
		return
	}

	if err := db.Redis.XAdd(c.Request.Context(), &redis.XAddArgs{
		Stream: analyticsStream,
		Values: map[string]interface{}{
			"data": string(data),
		},
		MaxLen: analyticsMaxLen,
		Approx: true,
	}).Err(); err != nil {
		log.Printf("[EventIngest] Redis XAdd failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to ingest event"})
		return
	}

	c.Status(http.StatusAccepted)
}
