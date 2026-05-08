package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	db := connectDB()
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get underlying SQL DB:", err)
	}
	defer sqlDB.Close()

	fmt.Println("Connected to database successfully")

	fixUserSettingsConstraint(db)
	fixCategoryColumns(db)
	updateCategoryRows(db)
	addCategoryIndexes(db)

	fmt.Println("\n🎉 All database fixes applied successfully!")
	fmt.Println("The backend should now start without AutoMigrate errors.")
}

func connectDB() *gorm.DB {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is not set. Please provide it to connect to the database.")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	return db
}

func fixUserSettingsConstraint(db *gorm.DB) {
	fmt.Println("Fixing UserSettings constraint...")
	var constraintExists bool
	err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.table_constraints 
			WHERE constraint_name = 'uni_UserSettings_user_id' 
			AND table_name = 'UserSettings'
		)
	`).Scan(&constraintExists).Error

	if err != nil {
		log.Fatal("Error checking UserSettings constraint:", err)
	}

	if !constraintExists {
		err = db.Exec(`
			ALTER TABLE "UserSettings" 
			ADD CONSTRAINT "uni_UserSettings_user_id" UNIQUE ("user_id")
		`).Error
		if err != nil {
			log.Fatal("Error creating UserSettings constraint:", err)
		}
		fmt.Println("✓ Created uni_UserSettings_user_id constraint")
	} else {
		fmt.Println("✓ UserSettings constraint already exists")
	}
}

func fixCategoryColumns(db *gorm.DB) {
	fmt.Println("Fixing Category columns...")
	ensureColumn(db, "Category", "created_at", `ALTER TABLE "Category" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)
	ensureColumn(db, "Category", "updated_at", `ALTER TABLE "Category" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`)
}

func ensureColumn(db *gorm.DB, tableName, columnName, alterSQL string) {
	var exists bool
	err := db.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = ? AND column_name = ?
		)
	`, tableName, columnName).Scan(&exists).Error

	if err != nil {
		log.Fatalf("Error checking %s %s column: %v", tableName, columnName, err)
	}

	if !exists {
		if err := db.Exec(alterSQL).Error; err != nil {
			log.Fatalf("Error adding %s %s column: %v", tableName, columnName, err)
		}
		fmt.Printf("✓ Added %s column to %s\n", columnName, tableName)
	} else {
		fmt.Printf("✓ %s %s column already exists\n", tableName, columnName)
	}
}

func updateCategoryRows(db *gorm.DB) {
	fmt.Println("Updating existing Category rows...")
	updateRows(db, "Category", "created_at")
	updateRows(db, "Category", "updated_at")
}

func updateRows(db *gorm.DB, tableName, columnName string) {
	result := db.Exec(fmt.Sprintf(`
		UPDATE "%s" 
		SET "%s" = CURRENT_TIMESTAMP 
		WHERE "%s" IS NULL
	`, tableName, columnName, columnName))

	if result.Error != nil {
		log.Fatalf("Error updating %s %s: %v", tableName, columnName, result.Error)
	}
	fmt.Printf("✓ Updated %d %s rows with %s\n", result.RowsAffected, tableName, columnName)
}

func addCategoryIndexes(db *gorm.DB) {
	fmt.Println("Adding Category indexes...")
	createIndex(db, "idx_category_created_at", "Category", "created_at")
	createIndex(db, "idx_category_updated_at", "Category", "updated_at")
}

func createIndex(db *gorm.DB, indexName, tableName, columnName string) {
	err := db.Exec(fmt.Sprintf(`CREATE INDEX IF NOT EXISTS %s ON "%s" ("%s")`, indexName, tableName, columnName)).Error
	if err != nil {
		log.Fatalf("Error creating %s index: %v", indexName, err)
	}
	fmt.Printf("✓ Added %s index\n", indexName)
}
