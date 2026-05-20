package main

import (
	"log"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize Configuration
	cfg := config.Load()

	// Initialize Database
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Checking/Applying SQL database migrations...")
	if err := db.RunSQLMigrations(database); err != nil {
		log.Fatalf("CRITICAL: SQL migrations failed: %v", err)
	}
	log.Println("SQL database migrations applied successfully.")

	// Seed AFTER SQL migrations to ensure all tables exist
	if err := db.Seed(); err != nil {
		log.Printf("Seeding failed: %v", err)
	} else {
		log.Println("Database seeded successfully.")
	}

	log.Println("Migration and seeding process completed.")
}
