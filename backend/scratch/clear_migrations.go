//go:build ignore
package main

import (
	"log"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	cfg := config.Load()
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	// Drop schema_migrations table so migrations rerun
	if err := database.Exec(`DROP TABLE IF EXISTS "schema_migrations"`).Error; err != nil {
		log.Fatalf("Failed to drop schema_migrations: %v", err)
	}
	
	log.Println("Successfully dropped schema_migrations table.")
}
