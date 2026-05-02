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
	godotenv.Load("../.env")
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is empty")
	}

	gdb, err := db.Connect(dsn)
	if err != nil {
		log.Fatal(err)
	}

	var subjects []models.Subject
	if err := gdb.Find(&subjects).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Found %d subjects:\n", len(subjects))
	for _, s := range subjects {
		fmt.Printf("- %s: %s\n", s.ID, s.Name)
	}
}
