package db

import (
	"context"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"log"
)

var Redis *redis.Client
var ctx = context.Background()

func ConnectRedis(url string) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		log.Printf("Failed to parse Redis URL: %v", err)
		return
	}

	// Configure Redis connection pooling for massive scale. Defaults are safe for
	// a few app replicas and can be tuned per deployment without code changes.
	opts.PoolSize = getRedisInt("REDIS_POOL_SIZE", 100)
	opts.MinIdleConns = getRedisInt("REDIS_MIN_IDLE_CONNS", 10)
	opts.MaxRetries = getRedisInt("REDIS_MAX_RETRIES", 5)
	opts.DialTimeout = 5 * time.Second
	opts.ReadTimeout = 2 * time.Second
	opts.WriteTimeout = 2 * time.Second
	opts.PoolTimeout = 4 * time.Second
	opts.ConnMaxLifetime = 30 * time.Minute

	Redis = redis.NewClient(opts)

	if err := Redis.Ping(ctx).Err(); err != nil {
		log.Printf("Failed to connect to Redis: %v", err)
		Redis = nil
		return
	}

	log.Println("Redis connection established with connection pooling")
}

func getRedisInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.Atoi(value)
		if err == nil && parsed > 0 {
			return parsed
		}
	}
	return fallback
}
