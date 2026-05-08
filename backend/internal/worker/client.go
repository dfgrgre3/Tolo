package worker

import (
	"log"
	"os"
	"strings"

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
				// Fallback to basic opts if parse fails
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
