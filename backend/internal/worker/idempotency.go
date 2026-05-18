package worker

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log"
	"time"

	"thanawy-backend/internal/db"

	"github.com/hibiken/asynq"
)

const (
	taskLockPrefix = "task-lock:"
	taskLockTTL    = 7 * 24 * time.Hour
)

// WithTaskIdempotency wraps an asynq handler to prevent duplicate execution.
// Uses Redis SET NX with key = task-lock:<type>:<sha256(payload)>.
// Returns nil (success) if already processed — the task is silently deduplicated.
func WithTaskIdempotency(next asynq.HandlerFunc) asynq.HandlerFunc {
	return func(ctx context.Context, t *asynq.Task) error {
		if db.Redis == nil {
			return next(ctx, t)
		}

		payloadHash := sha256.Sum256(t.Payload())
		lockKey := fmt.Sprintf("%s%s:%x", taskLockPrefix, t.Type(), payloadHash)

		locked, err := db.Redis.SetNX(ctx, lockKey, "1", taskLockTTL).Result()
		if err != nil {
			log.Printf("[TaskIdempotency] Redis error for %s: %v", t.Type(), err)
			return next(ctx, t)
		}
		if !locked {
			log.Printf("[TaskIdempotency] Skipping duplicate task %s (already processed)", t.Type())
			return nil
		}

		return next(ctx, t)
	}
}
