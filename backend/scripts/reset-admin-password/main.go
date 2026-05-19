package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		// Try parent dirs too
		if err2 := godotenv.Load("../../.env"); err2 != nil {
			log.Println("No .env file found, using system environment variables")
		}
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	email := os.Getenv("DEFAULT_ADMIN_EMAIL")
	if email == "" {
		email = "admin@thanawy.com"
	}
	password := os.Getenv("DEFAULT_ADMIN_PASSWORD")
	if password == "" {
		password = "Admin@Tolo2026!"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	result := db.Exec(`UPDATE "User" SET "passwordHash" = ? WHERE email = ?`, string(hash), email)
	if result.Error != nil {
		log.Fatalf("Failed to update password: %v", result.Error)
	}
	if result.RowsAffected == 0 {
		log.Printf("No user found with email %s. Creating admin user...", email)
		result = db.Exec(`INSERT INTO "User" (id, email, "passwordHash", role, status, created_at, updated_at, version)
			VALUES (gen_random_uuid(), ?, ?, 'ADMIN', 'ACTIVE', NOW(), NOW(), 1)`, email, string(hash))
		if result.Error != nil {
			log.Fatalf("Failed to create admin: %v", result.Error)
		}
		fmt.Printf("✅ Admin user created: %s\n", email)
	} else {
		fmt.Printf("✅ Password updated for: %s\n", email)
	}
	fmt.Printf("   Password: %s\n", password)
}
