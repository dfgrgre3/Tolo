package main

import (
	"fmt"
	"log"
	"os"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is empty")
	}

	database, err := db.Connect(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	var setting models.SystemSetting
	result := database.Where("key = ?", "admin_settings").First(&setting)
	if result.Error != nil {
		fmt.Printf("Error fetching admin_settings: %v\n", result.Error)
		return
	}

	fmt.Printf("Key: %s\n", setting.Key)
	fmt.Printf("Value: %s\n", setting.Value)
}
