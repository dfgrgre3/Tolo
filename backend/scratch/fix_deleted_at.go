//go:build ignore

package main

import (
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	log.Println("Connecting to database...")
	logMode := logger.Warn
	if os.Getenv("DB_DEBUG") == "true" {
		logMode = logger.Info
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logMode),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Adding deleted_at column to User table...")
	sql := `DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'deleted_at') THEN
        ALTER TABLE "User" ADD COLUMN "deleted_at" TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "User" ("deleted_at");
    END IF;
END
$$;`

	if err := database.Exec(sql).Error; err != nil {
		log.Fatalf("Failed to add column: %v", err)
	}

	// Also record this migration as applied so it doesn't try to run again
	if err := database.Exec(`
		CREATE TABLE IF NOT EXISTS "schema_migrations" (
			id text PRIMARY KEY,
			checksum text NOT NULL,
			"appliedAt" timestamptz NOT NULL DEFAULT now()
		)
	`).Error; err != nil {
		log.Printf("Warning: could not ensure schema_migrations table: %v", err)
	}

	// Record the migration
	database.Exec(`
		INSERT INTO "schema_migrations" (id, checksum, "appliedAt") 
		VALUES ('0009_fix_missing_columns_and_tables', 'manual', now()) 
		ON CONFLICT (id) DO NOTHING
	`)

	log.Println("Successfully added deleted_at column to User table!")
}
