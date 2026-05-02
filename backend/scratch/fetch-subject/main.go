package main

import (
	"encoding/json"
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

	id := "cmog5po8t01ltzwm8kdto27b3"
	var subject models.Subject
	err = gdb.Preload("Topics.SubTopics.Attachments").Preload("Topics.SubTopics.Exam").First(&subject, "\"id\" = ?", id).Error
	if err != nil {
		log.Fatalf("Error fetching subject: %v", err)
	}

	fmt.Printf("Fetched subject: %s\n", subject.Name)
	b, _ := json.MarshalIndent(subject, "", "  ")
	fmt.Println(string(b))
}
