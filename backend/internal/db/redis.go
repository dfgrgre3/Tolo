package db

import (
	"context"
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

	// Configure Redis connection pooling for massive scale
	opts.PoolSize = 100 // Increased pool size
	opts.MinIdleConns = 10
	opts.MaxRetries = 5
	opts.DialTimeout = 5 * time.Second
	opts.ReadTimeout = 2 * time.Second
	opts.WriteTimeout = 2 * time.Second
	opts.PoolTimeout = 4 * time.Second
	opts.ConnMaxLifetime = 30 * time.Minute

	Redis = redis.NewClient(opts)
	
	if err := Redis.Ping(ctx).Err(); err != nil {
		log.Printf("Failed to connect to Redis: %v", err)
		return
	}

	log.Println("Redis connection established with connection pooling")
}
