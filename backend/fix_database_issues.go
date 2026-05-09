package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib" // Standard library compatibility for pgx (PostgreSQL driver)

)

func main() {
	db := connectDB()
	defer db.Close()

	fmt.Println("Connected to database successfully")

	fixUserSettingsConstraint(db)
	fixCategoryColumns(db)
	updateCategoryRows(db)
	addCategoryIndexes(db)

	fmt.Println("\n🎉 All database fixes applied successfully!")
	fmt.Println("The backend should now start without AutoMigrate errors.")
}

func connectDB() *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}
	return db
}

func fixUserSettingsConstraint(db *sql.DB) {
	fmt.Println("Fixing UserSettings constraint...")
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.table_constraints 
			WHERE constraint_name = 'uni_UserSettings_user_id' 
			AND table_name = 'UserSettings'
		)
	`).Scan(&exists)

	if err != nil {
		log.Fatal("Error checking UserSettings constraint:", err)
	}

	if !exists {
		_, err = db.Exec(`
			ALTER TABLE "UserSettings" 
			ADD CONSTRAINT "uni_UserSettings_user_id" UNIQUE ("user_id")
		`)
		if err != nil {
			log.Fatal("Error creating UserSettings constraint:", err)
		}
		fmt.Println("✓ Created uni_UserSettings_user_id constraint")
	} else {
		fmt.Println("✓ UserSettings constraint already exists")
	}
}

func fixCategoryColumns(db *sql.DB) {
	fmt.Println("Fixing Category columns...")
	ensureColumn(db, "Category", "created_at", `ALTER TABLE "Category" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)
	ensureColumn(db, "Category", "updated_at", `ALTER TABLE "Category" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)
}

func ensureColumn(db *sql.DB, tableName, columnName, alterSQL string) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = $1 AND column_name = $2
		)
	`, tableName, columnName).Scan(&exists)

	if err != nil {
		log.Fatalf("Error checking %s %s column: %v", tableName, columnName, err)
	}

	if !exists {
		if _, err := db.Exec(alterSQL); err != nil {
			log.Fatalf("Error adding %s %s column: %v", tableName, columnName, err)
		}
		fmt.Printf("✓ Added %s column to %s\n", columnName, tableName)
	} else {
		fmt.Printf("✓ %s %s column already exists\n", tableName, columnName)
	}
}

func updateCategoryRows(db *sql.DB) {
	fmt.Println("Updating existing Category rows...")
	updateRows(db, "Category", "created_at")
	updateRows(db, "Category", "updated_at")
}

func updateRows(db *sql.DB, tableName, columnName string) {
	var query string
	// Use hardcoded queries for specific table/column combinations to ensure safety
	// and address security hotspot go:S2077 (SQL Injection).
	// SQL identifiers (tables/columns) cannot be parameterized, so we use structural mapping.
	if tableName == "Category" && columnName == "created_at" {
		query = `UPDATE "Category" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL`
	} else if tableName == "Category" && columnName == "updated_at" {
		query = `UPDATE "Category" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL`
	} else {
		log.Fatalf("Security: unauthorized update target: %s.%s", tableName, columnName)
	}

	result, err := db.Exec(query)
	if err != nil {
		log.Fatalf("Error updating %s %s: %v", tableName, columnName, err)
	}

	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("✓ Updated %d %s rows with %s\n", rowsAffected, tableName, columnName)
}

func addCategoryIndexes(db *sql.DB) {
	fmt.Println("Adding Category indexes...")
	createIndex(db, "idx_category_created_at", "Category", "created_at")
	createIndex(db, "idx_category_updated_at", "Category", "updated_at")
}

func createIndex(db *sql.DB, indexName, tableName, columnName string) {
	var query string
	// Use hardcoded queries to address security hotspot go:S2077 (SQL Injection).
	if tableName == "Category" && columnName == "created_at" && indexName == "idx_category_created_at" {
		query = `CREATE INDEX IF NOT EXISTS "idx_category_created_at" ON "Category" ("created_at")`
	} else if tableName == "Category" && columnName == "updated_at" && indexName == "idx_category_updated_at" {
		query = `CREATE INDEX IF NOT EXISTS "idx_category_updated_at" ON "Category" ("updated_at")`
	} else {
		log.Fatalf("Security: unauthorized index creation: %s on %s(%s)", indexName, tableName, columnName)
	}

	if _, err := db.Exec(query); err != nil {
		log.Fatalf("Error creating %s index: %v", indexName, err)
	}
	fmt.Printf("✓ Added %s index\n", indexName)
}
