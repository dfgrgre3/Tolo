package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/events"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	analyticsStream       = "analytics:events"
	analyticsConsumerGroup = "analytics-workers"
	analyticsConsumerID   = "worker-1"
	analyticsBatchSize = 100
	analyticsBlockTime = 5 * time.Second
)

// StartAnalyticsBatchWorker starts the Redis Stream consumer for analytics events.
// It runs in its own goroutine and is completely independent from Asynq.
// This separates analytics traffic from business logic queues.
func StartAnalyticsBatchWorker() {
	if db.Redis == nil {
		log.Println("[AnalyticsWorker] Redis not available, skipping")
		return
	}

	if err := ensureConsumerGroup(); err != nil {
		log.Printf("[AnalyticsWorker] Failed to setup consumer group: %v", err)
		return
	}

	log.Println("[AnalyticsWorker] Starting Redis Stream consumer (separate from Asynq)")
	for {
		if err := processBatch(); err != nil {
			log.Printf("[AnalyticsWorker] Batch error: %v", err)
			time.Sleep(1 * time.Second)
		}
	}
}

func ensureConsumerGroup() error {
	err := db.Redis.XGroupCreateMkStream(
		context.Background(),
		analyticsStream,
		analyticsConsumerGroup,
		"$",
	).Err()
	if err != nil && !hasPrefix(err.Error(), "BUSYGROUP") {
		return err
	}
	return nil
}

func hasPrefix(s, prefix string) bool {
	if len(s) < len(prefix) {
		return false
	}
	return s[:len(prefix)] == prefix
}

func processBatch() error {
	ctx := context.Background()

	entries, err := db.Redis.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    analyticsConsumerGroup,
		Consumer: analyticsConsumerID,
		Streams:  []string{analyticsStream, ">"},
		Count:    int64(analyticsBatchSize),
		Block:    analyticsBlockTime,
		NoAck:    false,
	}).Result()
	if err != nil {
		if err == redis.Nil {
			return nil
		}
		return err
	}

	if len(entries) == 0 || len(entries[0].Messages) == 0 {
		return nil
	}

	messages := entries[0].Messages
	log.Printf("[AnalyticsWorker] Processing batch of %d events", len(messages))

	records := make([]map[string]interface{}, 0, len(messages))
	ids := make([]string, 0, len(messages))

	for _, msg := range messages {
		rawData, ok := msg.Values["data"].(string)
		if !ok {
			ids = append(ids, msg.ID)
			continue
		}

		var event events.AnalyticsEvent
		if err := json.Unmarshal([]byte(rawData), &event); err != nil {
			log.Printf("[AnalyticsWorker] Skipping malformed event %s: %v", msg.ID, err)
			ids = append(ids, msg.ID)
			continue
		}

		var payload map[string]interface{}
		json.Unmarshal(event.Payload, &payload)
		if payload == nil {
			payload = make(map[string]interface{})
		}

		records = append(records, map[string]interface{}{
			"event_id":    event.ID,
			"event_type":  string(event.Type),
			"user_id":     event.UserID,
			"payload":     payload,
			"source":      "frontend",
			"received_at": time.UnixMilli(event.Timestamp),
			"created_at":  time.Now(),
		})
		ids = append(ids, msg.ID)
	}

	if len(records) > 0 {
		if err := batchInsert(ctx, records); err != nil {
			return err
		}
	}

	if err := db.Redis.XAck(ctx, analyticsStream, analyticsConsumerGroup, ids...).Err(); err != nil {
		log.Printf("[AnalyticsWorker] Failed to ack messages: %v", err)
		return err
	}

	return nil
}

func batchInsert(ctx context.Context, records []map[string]interface{}) error {
	if db.WriteDB() == nil {
		return nil
	}

	batchSize := 50
	for i := 0; i < len(records); i += batchSize {
		end := i + batchSize
		if end > len(records) {
			end = len(records)
		}
		batch := records[i:end]

		tx := db.WriteDB().Session(&gorm.Session{PrepareStmt: false}).Begin()
		stmt := `INSERT INTO "AnalyticsEvent" ("event_id", "event_type", "user_id", "payload", "source", "received_at", "created_at")
				 VALUES (?, ?, ?::text, ?::jsonb, ?, ?, ?)
				 ON CONFLICT ("event_id") DO NOTHING`
		for _, rec := range batch {
			if err := tx.Exec(stmt,
				rec["event_id"],
				rec["event_type"],
				rec["user_id"],
				toJSONString(rec["payload"]),
				rec["source"],
				rec["received_at"],
				rec["created_at"],
			).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
		if err := tx.Commit().Error; err != nil {
			return err
		}
	}

	log.Printf("[AnalyticsWorker] Inserted %d events into AnalyticsEvent", len(records))
	return nil
}

func toJSONString(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}
