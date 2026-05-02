package main

import (
	"log"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	cfg := config.Load()
	dbInstance, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}

	// Find duplicate user settings
	var duplicates []struct {
		UserID string
		Count  int
	}
	dbInstance.Raw(`SELECT "userId", COUNT(*) as count FROM "UserSettings" GROUP BY "userId" HAVING COUNT(*) > 1`).Scan(&duplicates)

	for _, dup := range duplicates {
		log.Printf("User %s has %d settings records", dup.UserID, dup.Count)
		// Keep the most recently updated one, delete the rest
		var settings []models.UserSettings
		dbInstance.Where("\"userId\" = ?", dup.UserID).Order("\"updatedAt\" DESC").Find(&settings)

		for i := 1; i < len(settings); i++ { // Skip the first one (most recent)
			log.Printf("Deleting duplicate setting %s for user %s", settings[i].ID, dup.UserID)
			dbInstance.Unscoped().Delete(&settings[i])
		}
	}

	log.Println("Creating unique index on UserSettings(userId) to prevent future duplicates")
	// Add unique index using raw SQL because AutoMigrate might not enforce it if duplicates existed
	dbInstance.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON "UserSettings"("userId")`)

	log.Println("Done fixing duplicates.")
}
