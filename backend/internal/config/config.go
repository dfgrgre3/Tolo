package config

import (
	"log"
	"os"
	"strings"
	"thanawy-backend/internal/models"

	"github.com/google/uuid"
)

var GlobalConfig *Config

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Environment string

	// Storage Configuration
	StorageType  string // "local" or "s3"
	LocalStorage struct {
		BasePath string
		BaseURL  string
	}
	S3 struct {
		Endpoint  string
		AccessKey string
		SecretKey string
		Bucket    string
		Region    string
		UseSSL    bool
		PublicURL string
	}
	InternalIPRanges []string
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

	c := &Config{
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		Environment: environment,
		StorageType: getEnv("STORAGE_TYPE", "local"),
	}

	// Local Storage Config
	c.LocalStorage.BasePath = getEnv("LOCAL_STORAGE_PATH", "./uploads")
	c.LocalStorage.BaseURL = getEnv("LOCAL_STORAGE_URL", "/uploads")

	// S3 Storage Config
	c.S3.Endpoint = getEnv("S3_ENDPOINT", "")
	c.S3.AccessKey = getEnv("S3_ACCESS_KEY", "")
	c.S3.SecretKey = getEnv("S3_SECRET_KEY", "")
	c.S3.Bucket = getEnv("S3_BUCKET", "")
	c.S3.Region = getEnv("S3_REGION", "us-east-1")
	c.S3.UseSSL = getEnv("S3_USE_SSL", "true") == "true"
	c.S3.PublicURL = getEnv("S3_PUBLIC_URL", "")

	// IP Whitelist Config
	// Standard RFC 1918 and loopback ranges used as defaults
	defaultRanges := []string{
		"127.0.0.1/8",    // IPv4 Loopback
		"10.0.0.0/8",     // RFC 1918
		"172.16.0.0/12",  // RFC 1918
		"192.168.0.0/16", // RFC 1918
		"::1/128",        // IPv6 Loopback
	}
	models.DefaultInternalIPRanges = defaultRanges

	internalIPsRaw := getEnv("INTERNAL_IP_RANGES", "")
	if internalIPsRaw != "" {
		c.InternalIPRanges = strings.Split(internalIPsRaw, ",")
	} else {
		c.InternalIPRanges = defaultRanges
	}

	return c
}

// generateRandomString generates a random string for dev secrets
func generateRandomString(n int) string {
	if _, err := uuid.NewRandom(); err != nil {
		return uuid.New().String()
	}
	// Use uuid to generate random string
	result := uuid.New().String()
	if len(result) > n {
		return result[:n]
	}
	return result
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
