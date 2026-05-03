package config

import (
	"log"
	"os"
	"time"

	"github.com/google/uuid"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Environment string
}

func Load() *Config {
	dbURL := getEnv("DATABASE_URL", "")
	jwtSecret := getEnv("JWT_SECRET", "")
	environment := getEnv("NODE_ENV", "development")

	// CRITICAL SECURITY FIX: Never allow default or empty JWT secret in production
	if environment == "production" {
		if jwtSecret == "" || jwtSecret == "default_secret" || jwtSecret == "dev_only_secret_change_in_production" {
			log.Fatal("FATAL: JWT_SECRET MUST be set to a secure, unique value in production environments.")
		}
		if len(jwtSecret) < 32 {
			log.Fatal("FATAL: JWT_SECRET must be at least 32 characters long for production security.")
		}
	} else if jwtSecret == "" {
		log.Println("WARNING: JWT_SECRET is not set. Using insecure default for development only.")
		jwtSecret = "dev_only_secret_change_in_production_" + generateRandomString(16)
	}

	return &Config{
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		Environment: environment,
	}
}

// generateRandomString generates a random string for dev secrets
func generateRandomString(n int) string {
	b := make([]byte, n)
	if _, err := uuid.NewRandom(); err != nil {
		return uuid.New().String()
	}
	// Use uuid to generate random string
	return uuid.New().String()[:n]
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
