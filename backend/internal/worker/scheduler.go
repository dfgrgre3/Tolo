package worker

import (
	"log"
	"os"
	"strings"

	"github.com/hibiken/asynq"
)

// StartScheduler starts the periodic task scheduler.
// It runs CQRS materialized view refresh every 5 minutes.
func StartScheduler() {
	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	var opts asynq.RedisConnOpt
	if strings.HasPrefix(redisAddr, "redis://") || strings.HasPrefix(redisAddr, "rediss://") {
		parsedOpts, err := asynq.ParseRedisURI(redisAddr)
		if err != nil {
			log.Printf("failed to parse redis uri for scheduler: %v", err)
			return
		}
		opts = parsedOpts
	} else {
		opts = asynq.RedisClientOpt{Addr: redisAddr}
	}

	scheduler := asynq.NewScheduler(opts, &asynq.SchedulerOpts{})

	// Refresh materialized views every 5 minutes
	if _, err := scheduler.Register("@every 5m", asynq.NewTask(TypeRefreshMaterializedViews, []byte("{}"))); err != nil {
		log.Printf("Failed to register CQRS refresh task: %v", err)
		return
	}

	log.Println("[Scheduler] Periodic CQRS view refresh scheduled every 5 minutes")
	if err := scheduler.Start(); err != nil {
		log.Printf("Failed to start scheduler: %v", err)
	}
}
