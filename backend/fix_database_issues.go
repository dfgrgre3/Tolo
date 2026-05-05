package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	fmt.Println("Connected to database successfully")

	// Fix 1: Create the UserSettings constraint if it doesn't exist
	fmt.Println("Fixing UserSettings constraint...")
	var constraintExists bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.table_constraints 
			WHERE constraint_name = 'uni_UserSettings_user_id' 
			AND table_name = 'UserSettings'
		)
	`).Scan(&constraintExists)
	
	if err != nil {
		log.Fatal("Error checking UserSettings constraint:", err)
	}

	if !constraintExists {
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

	// Fix 2: Add created_at column to Category table if it doesn't exist
	fmt.Println("Fixing Category created_at column...")
	var createdAtExists bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'Category' AND column_name = 'created_at'
		)
	`).Scan(&createdAtExists)
	
	if err != nil {
		log.Fatal("Error checking Category created_at column:", err)
	}

	if !createdAtExists {
		_, err = db.Exec(`
			ALTER TABLE "Category" ADD COLUMN "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		`)
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
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'Category' AND column_name = 'updated_at'
		)
	`).Scan(&updatedAtExists)
	
	if err != nil {
		log.Fatal("Error checking Category updated_at column:", err)
	}

	if !updatedAtExists {
		_, err = db.Exec(`
			ALTER TABLE "Category" ADD COLUMN "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		`)
		if err != nil {
			log.Fatal("Error adding Category updated_at column:", err)
		}
		fmt.Println("✓ Added updated_at column to Category")
	} else {
		fmt.Println("✓ Category updated_at column already exists")
	}

	// Fix 4: Update existing Category rows with timestamps
	fmt.Println("Updating existing Category rows...")
	result, err := db.Exec(`
		UPDATE "Category" 
		SET "created_at" = CURRENT_TIMESTAMP 
		WHERE "created_at" IS NULL
	`)
	if err != nil {
		log.Fatal("Error updating Category created_at:", err)
	}
	rowsAffected, _ := result.RowsAffected()
	fmt.Printf("✓ Updated %d Category rows with created_at\n", rowsAffected)

	result, err = db.Exec(`
		UPDATE "Category" 
		SET "updated_at" = CURRENT_TIMESTAMP 
		WHERE "updated_at" IS NULL
	`)
	if err != nil {
		log.Fatal("Error updating Category updated_at:", err)
	}
	rowsAffected, _ = result.RowsAffected()
	fmt.Printf("✓ Updated %d Category rows with updated_at\n", rowsAffected)

	// Fix 5: Add indexes
	fmt.Println("Adding Category indexes...")
	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_category_created_at ON "Category" ("created_at")`)
	if err != nil {
		log.Fatal("Error creating Category created_at index:", err)
	}
	fmt.Println("✓ Added idx_category_created_at index")

	_, err = db.Exec(`CREATE INDEX IF NOT EXISTS idx_category_updated_at ON "Category" ("updated_at")`)
	if err != nil {
		log.Fatal("Error creating Category updated_at index:", err)
	}
	fmt.Println("✓ Added idx_category_updated_at index")

	fmt.Println("\n🎉 All database fixes applied successfully!")
	fmt.Println("The backend should now start without AutoMigrate errors.")
}
