package config

import (
	"os"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Environment string
}

func Load() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", "default_secret"),
		Environment: getEnv("NODE_ENV", "development"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
