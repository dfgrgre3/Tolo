package main

import (
	"fmt"
	"log"
	"os"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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

	email := "admin@thanawy.app"
	password := "Admin@123456"

	var user models.User
	err = db.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			fmt.Printf("User %s not found. Creating...\n", email)
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), 12)
			user = models.User{
				Email:        email,
				PasswordHash: string(hashedPassword),
				Role:         models.RoleAdmin,
				Status:       models.StatusActive,
			}
			if err := db.DB.Create(&user).Error; err != nil {
				log.Fatalf("Failed to create user: %v", err)
			}
			fmt.Println("User created successfully.")
		} else {
			log.Fatalf("Error finding user: %v", err)
		}
	} else {
		fmt.Printf("User %s found. Resetting password...\n", email)
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), 12)
		user.PasswordHash = string(hashedPassword)
		user.Status = models.StatusActive
		if err := db.DB.Save(&user).Error; err != nil {
			log.Fatalf("Failed to update user: %v", err)
		}
		fmt.Println("User updated successfully.")
	}
}
