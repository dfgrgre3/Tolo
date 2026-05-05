package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "postgresql://postgres:Khaled%402008@127.0.0.1:5432/thanawy?sslmode=disable"
	// Try to get from environment if possible, but let's assume default for now or check if there's a config
	
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
