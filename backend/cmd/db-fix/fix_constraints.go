package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Get database connection string from environment (same as db-fix main.go)
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=postgres dbname=thanawy_db port=5432 sslmode=disable"
		log.Println("Using default DATABASE_URL. Set DATABASE_URL environment variable for production.")
	}
	
	// Connect to database
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Get underlying SQL DB for raw queries
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatal("Failed to get underlying SQL DB:", err)
	}
	defer sqlDB.Close()

	fmt.Println("Connected to database successfully")

	// Fix 1: Create UserSettings constraint if it doesn't exist
	fmt.Println("Fixing UserSettings constraint...")
	var constraintExists bool
	result := database.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.table_constraints 
			WHERE constraint_name = 'uni_UserSettings_user_id' 
			AND table_name = 'UserSettings'
		)
	`).Scan(&constraintExists)
	
	if result.Error != nil {
		log.Fatal("Error checking UserSettings constraint:", result.Error)
	}

	if !constraintExists {
		err = database.Exec(`
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

	// Fix 2: Add created_at column to Category table if it doesn't exist
	fmt.Println("Fixing Category created_at column...")
	var createdAtExists bool
	result = database.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'Category' AND column_name = 'created_at'
		)
	`).Scan(&createdAtExists)
	
	if result.Error != nil {
		log.Fatal("Error checking Category created_at column:", result.Error)
	}

	if !createdAtExists {
		err = database.Exec(`
			ALTER TABLE "Category" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		`).Error
		if err != nil {
			log.Fatal("Error adding Category created_at column:", err)
		}
		fmt.Println("✓ Added created_at column to Category")
	} else {
		fmt.Println("✓ Category created_at column already exists")
	}

	// Fix 3: Add updated_at column to Category table if it doesn't exist
	fmt.Println("Fixing Category updated_at column...")
	var updatedAtExists bool
	result = database.Raw(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'Category' AND column_name = 'updated_at'
		)
	`).Scan(&updatedAtExists)
	
	if result.Error != nil {
		log.Fatal("Error checking Category updated_at column:", result.Error)
	}

	if !updatedAtExists {
		err = database.Exec(`
			ALTER TABLE "Category" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		`).Error
		if err != nil {
			log.Fatal("Error adding Category updated_at column:", err)
		}
		fmt.Println("✓ Added updated_at column to Category")
	} else {
		fmt.Println("✓ Category updated_at column already exists")
	}

	// Fix 4: Update existing Category rows with timestamps
	fmt.Println("Updating existing Category rows...")
	result = database.Exec(`
		UPDATE "Category" 
		SET "created_at" = CURRENT_TIMESTAMP 
		WHERE "created_at" IS NULL
	`)
	if err != nil {
		log.Fatal("Error updating Category created_at:", err)
	}
	fmt.Printf("✓ Updated %d Category rows with created_at\n", result.RowsAffected)

	result = database.Exec(`
		UPDATE "Category" 
		SET "updated_at" = CURRENT_TIMESTAMP 
		WHERE "updated_at" IS NULL
	`)
	if err != nil {
		log.Fatal("Error updating Category updated_at:", err)
	}
	fmt.Printf("✓ Updated %d Category rows with updated_at\n", result.RowsAffected)

	// Fix 5: Add indexes
	fmt.Println("Adding Category indexes...")
	err = database.Exec(`CREATE INDEX IF NOT EXISTS idx_category_created_at ON "Category" ("created_at")`).Error
	if err != nil {
		log.Fatal("Error creating Category created_at index:", err)
	}
	fmt.Println("✓ Added idx_category_created_at index")

	err = database.Exec(`CREATE INDEX IF NOT EXISTS idx_category_updated_at ON "Category" ("updated_at")`).Error
	if err != nil {
		log.Fatal("Error creating Category updated_at index:", err)
	}
	fmt.Println("✓ Added idx_category_updated_at index")

	fmt.Println("\n🎉 All database fixes applied successfully!")
	fmt.Println("The backend should now start without AutoMigrate errors.")
}
