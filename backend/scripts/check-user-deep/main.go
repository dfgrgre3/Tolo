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

	var users []models.User
	db.DB.Unscoped().Where("email ILIKE ?", "admin@thanawy.app").Find(&users)
	fmt.Printf("Users found with email (ILIKE): %d\n", len(users))
	for _, u := range users {
		fmt.Printf("ID: %s - Email: %s - Role: %s - Status: %s - DeletedAt: %v\n", u.ID, u.Email, u.Role, u.Status, u.DeletedAt)
	}
}
