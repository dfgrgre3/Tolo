//go:build ignore

package main

import (
	"fmt"
	"github.com/joho/godotenv"
	"log"
	"os"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Fatal("Error loading .env file")
	}

	dsn := os.Getenv("DATABASE_URL")
	database, err := db.Connect(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	var setting models.SystemSetting
	err = database.Where("key = ?", "admin_settings").First(&setting).Error
	if err != nil {
		fmt.Printf("Error fetching admin_settings: %v\n", err)
		return
	}

	fmt.Printf("Key: %s\nValue: %s\n", setting.Key, setting.Value)
}
