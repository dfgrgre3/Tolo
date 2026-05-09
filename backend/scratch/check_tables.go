//go:build ignore
package main

import (
	"log"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	cfg := config.Load()
	database, _ := db.Connect(cfg.DatabaseURL)

	var tables []string
	database.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tables)
	log.Printf("Tables: %v", tables)
}
