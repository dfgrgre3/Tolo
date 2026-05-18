package worker

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/hibiken/asynq"
)

var client *asynq.Client

func GetClient() *asynq.Client {
	if client == nil {
		redisAddr := os.Getenv("REDIS_URL")
		if redisAddr == "" {
			redisAddr = "localhost:6379"
		}

		var opts asynq.RedisConnOpt
		if strings.HasPrefix(redisAddr, "redis://") || strings.HasPrefix(redisAddr, "rediss://") {
			parsedOpts, err := asynq.ParseRedisURI(redisAddr)
			if err != nil {
				log.Printf("failed to parse redis uri for worker client: %v", err)
				opts = asynq.RedisClientOpt{Addr: redisAddr}
			} else {
				opts = parsedOpts
			}
		} else {
			opts = asynq.RedisClientOpt{Addr: redisAddr}
		}

		client = asynq.NewClient(opts)
	}
	return client
}

func EnqueueNotification(payload NotificationPayload) error {
	task, err := NewMultiChannelNotificationTask(payload)
	if err != nil {
		return err
	}

	_, err = GetClient().Enqueue(task)
	return err
}

func EnqueueProgressUpdate(payload ProgressUpdatePayload) error {
	task, err := NewProgressUpdateTask(payload)
	if err != nil {
		return err
	}

	_, err = GetClient().Enqueue(task, asynq.Queue("progress"), asynq.ProcessIn(5*time.Second))
	return err
}

func EnqueueGamificationSync(payload GamificationSyncPayload) error {
	task, err := NewGamificationSyncTask(payload)
	if err != nil {
		return err
	}

	_, err = GetClient().Enqueue(task, asynq.Queue("gamification"), asynq.ProcessIn(5*time.Second))
	return err
}

func EnqueueBatchProgressFlush(userID string) error {
	payload := BatchProgressFlushPayload{UserID: userID}
	task, err := NewBatchProgressFlushTask(payload)
	if err != nil {
		return err
	}

	_, err = GetClient().Enqueue(task, asynq.Queue("progress"), asynq.ProcessIn(5*time.Second))
	return err
}
