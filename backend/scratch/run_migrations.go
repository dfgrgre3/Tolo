package main

import (
	"log"
	"os"
	"thanawy-backend/internal/db"
	_ "thanawy-backend/internal/models"
)

func main() {
	// Set environment variables for migration
	os.Setenv("RUN_DB_MIGRATIONS", "true")
	
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgresql://postgres:Khaled%402008@127.0.0.1:5432/thanawy?client_encoding=UTF8"
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
