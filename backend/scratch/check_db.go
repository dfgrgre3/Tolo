//go:build ignore
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
		log.Fatal(err)
	}

	var results []map[string]interface{}
	db.Raw("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'UserSettings'").Scan(&results)
	fmt.Println("INDEXES:")
	for _, row := range results {
		fmt.Printf("%v: %v\n", row["indexname"], row["indexdef"])
	}

	db.Raw("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'UserSettings'").Scan(&results)
	fmt.Println("\nCONSTRAINTS:")
	for _, row := range results {
		fmt.Printf("%v: %v\n", row["conname"], row["pg_get_constraintdef"])
	}
}
