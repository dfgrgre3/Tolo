package worker

import (
	"log"
	"os"
	"strings"

	"github.com/hibiken/asynq"
)

func StartWorker() {
	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	var opts asynq.RedisConnOpt
	if strings.HasPrefix(redisAddr, "redis://") || strings.HasPrefix(redisAddr, "rediss://") {
		parsedOpts, err := asynq.ParseRedisURI(redisAddr)
		if err != nil {
			log.Fatalf("failed to parse redis uri: %v", err)
		}
		opts = parsedOpts
	} else {
		opts = asynq.RedisClientOpt{Addr: redisAddr}
	}

	srv := asynq.NewServer(
		opts,
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical":     6,
				"default":      3,
				"low":          1,
				"progress":     2,
				"gamification": 1,
			},
		},
	)

	mux := asynq.NewServeMux()

	notificationHandler := &NotificationHandler{}
	mux.HandleFunc(TypeMultiChannelNotification, WithTaskIdempotency(notificationHandler.ProcessTask))

	progressHandler := &ProgressHandler{}
	mux.HandleFunc(TypeProgressUpdate, WithTaskIdempotency(progressHandler.ProcessTask))

	gamificationHandler := &GamificationHandler{}
	mux.HandleFunc(TypeGamificationSync, WithTaskIdempotency(gamificationHandler.ProcessTask))

	batchFlushHandler := &BatchProgressFlushHandler{}
	mux.HandleFunc(TypeBatchProgressFlush, WithTaskIdempotency(batchFlushHandler.ProcessTask))

	cqrsRefreshHandler := &CQRSRefreshHandler{}
	mux.HandleFunc(TypeRefreshMaterializedViews, WithTaskIdempotency(cqrsRefreshHandler.ProcessTask))

	log.Printf("Worker server starting on Redis %s", redisAddr)
	if err := srv.Run(mux); err != nil {
		log.Fatalf("could not run server: %v", err)
	}
}
