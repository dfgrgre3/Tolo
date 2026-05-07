package main

import (
	"fmt"
	"log"
	"os"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize Configuration
	cfg := config.Load()

	// Initialize Database
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	email := "admin@thanawy.app"
	newPassword := "YourNewSecurePassword123!" // CHANGE THIS

	if len(os.Args) > 1 {
		newPassword = os.Args[1]
	}

	var admin models.User
	if err := database.Where("email = ?", email).First(&admin).Error; err != nil {
		log.Fatalf("Admin user not found: %v", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	if err := database.Model(&admin).Update("password_hash", string(hashedPassword)).Error; err != nil {
		log.Fatalf("Failed to update password: %v", err)
	}

	fmt.Printf("Successfully updated password for %s\n", email)
	fmt.Println("Please remember to delete this script after use or keep it secure.")
}
