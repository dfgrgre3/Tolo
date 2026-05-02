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
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	_, err := db.Connect(databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	var logs []models.SecurityLog
	db.DB.Where("\"eventType\" LIKE ?", "LOGIN_%").Order("\"createdAt\" desc").Limit(20).Find(&logs)
	fmt.Printf("Total LOGIN events found: %d\n", len(logs))
	for _, l := range logs {
		fmt.Printf("Event: %s - UserID: %s - IP: %s - Metadata: %v - Time: %s\n", l.EventType, l.UserID, l.IP, l.Metadata, l.CreatedAt)
	}
}
