package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	// Check if PaymentStatus enum exists and its values
	var enumValues []string
	err = db.Raw(`
		SELECT e.enumlabel
		FROM pg_enum e
		JOIN pg_type t ON e.enumtypid = t.oid
		WHERE t.typname = 'PaymentStatus'
	`).Scan(&enumValues).Error

	if err != nil {
		log.Printf("Error checking enum: %v", err)
	} else if len(enumValues) > 0 {
		fmt.Printf("PaymentStatus enum values: %v\n", enumValues)
	} else {
		fmt.Println("PaymentStatus enum not found or has no values.")
	}

	// Check Payment table status column type
	var colType string
	err = db.Raw(`
		SELECT udt_name 
		FROM information_schema.columns 
		WHERE table_name = 'Payment' AND column_name = 'status'
	`).Scan(&colType).Error

	if err != nil {
		log.Printf("Error checking column type: %v", err)
	} else {
		fmt.Printf("Payment.status column type (udt_name): %s\n", colType)
	}
}
