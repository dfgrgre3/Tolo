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
		log.Fatalf("failed to connect database: %v", err)
	}

	rows, err := db.Raw(`
		SELECT table_name, column_name 
		FROM information_schema.columns 
		WHERE table_name ILIKE 'WalletTransaction' OR table_name ILIKE 'Coupon'
	`).Rows()
	if err != nil {
		log.Fatalf("failed to query columns: %v", err)
	}
	defer rows.Close()

	fmt.Println("Columns found:")
	for rows.Next() {
		var tableName, columnName string
		rows.Scan(&tableName, &columnName)
		fmt.Printf("Table: %s, Column: %s\n", tableName, columnName)
	}
}
