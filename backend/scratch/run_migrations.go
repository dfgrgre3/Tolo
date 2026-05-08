//go:build ignore

package main

import (
	"log"
	"os"
	"thanawy-backend/internal/db"
	_ "thanawy-backend/internal/models" // Import models to ensure they are registered with the database schema

)

func main() {
	// Set environment variables for migration
	os.Setenv("RUN_DB_MIGRATIONS", "true")

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	log.Println("Connecting to database...")
	database, err := db.Connect(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Running migrations...")
	if err := db.RunSQLMigrations(database); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("Migrations completed successfully!")
}
