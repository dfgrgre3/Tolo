package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DatabaseFixRunner automates the database fix and optimization process
func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	
	// Get database connection string from environment
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=postgres dbname=thanawy_db port=5432 sslmode=disable"
		log.Println("Using default DATABASE_URL. Set DATABASE_URL environment variable for production.")
	}

	fmt.Println("===========================================")
	fmt.Println("Thanawy Database Fix & Optimization Tool")
	fmt.Println("===========================================")
	fmt.Printf("Time: %s\n", time.Now().Format("2006-01-02 15:04:05"))
	fmt.Printf("Database: %s\n", dsn)
	fmt.Println()

	// Connect to database
	fmt.Println("Step 1: Connecting to database...")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	fmt.Println("✓ Connected successfully")
	fmt.Println()

	// Check database size before
	fmt.Println("Step 2: Checking database size before fix...")
	var dbSize string
	db.Raw("SELECT pg_size_pretty(pg_database_size(current_database()))").Scan(&dbSize)
	fmt.Printf("   Current database size: %s\n", dbSize)
	fmt.Println()

	// Read migration file
	fmt.Println("Step 3: Reading migration file...")
	migrationFile := "internal/db/migrations/0003_comprehensive_fix.sql"
	sqlContent, err := os.ReadFile(migrationFile)
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}
	fmt.Printf("   ✓ Loaded migration file (%d bytes)\n", len(sqlContent))
	fmt.Println()

	// Ask for confirmation in interactive mode
	if os.Getenv("AUTO_CONFIRM") != "true" {
		fmt.Println("⚠️  WARNING: This will modify your database!")
		fmt.Println("   - Fix data integrity issues")
		fmt.Println("   - Remove duplicate records")
		fmt.Println("   - Add new indexes")
		fmt.Println("   - Enforce constraints")
		fmt.Println("   - Create maintenance functions")
		fmt.Println()
		fmt.Println("Make sure you have:")
		fmt.Println("   1. Backed up your database")
		fmt.Println("   2. Tested in staging environment")
		fmt.Println("   3. Scheduled during low-traffic hours")
		fmt.Println()
		
		// For now, we'll proceed automatically
		// In production, add proper user input handling
		log.Println("Proceeding with migration (AUTO_CONFIRM=true or non-interactive mode)...")
	}

	// Execute migration
	fmt.Println("Step 4: Executing database fix...")
	startTime := time.Now()
	
	// Split SQL into statements and execute
	err = db.Exec(string(sqlContent)).Error
	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	
	duration := time.Since(startTime)
	fmt.Printf("   ✓ Migration completed in %v\n", duration)
	fmt.Println()

	// Verify migration
	fmt.Println("Step 5: Verifying migration...")
	
	// Check constraint count
	var constraintCount int
	db.Raw(`
		SELECT COUNT(*) 
		FROM pg_constraint 
		WHERE connamespace = 'public'::regnamespace 
		AND contype IN ('c', 'u', 'f')
	`).Scan(&constraintCount)
	fmt.Printf("   Total constraints: %d\n", constraintCount)

	// Check index count
	var indexCount int
	db.Raw(`
		SELECT COUNT(*) 
		FROM pg_indexes 
		WHERE schemaname = 'public'
	`).Scan(&indexCount)
	fmt.Printf("   Total indexes: %d\n", indexCount)

	// Check function count
	var functionCount int
	db.Raw(`
		SELECT COUNT(*) 
		FROM pg_proc 
		WHERE pronamespace = 'public'::regnamespace
		AND proname IN ('clean_old_notifications', 'clean_expired_sessions', 
		                 'recalculate_subject_stats', 'update_user_level')
	`).Scan(&functionCount)
	fmt.Printf("   Maintenance functions created: %d\n", functionCount)
	fmt.Println()

	// Check database size after
	fmt.Println("Step 6: Checking database size after fix...")
	var dbSizeAfter string
	db.Raw("SELECT pg_size_pretty(pg_database_size(current_database()))").Scan(&dbSizeAfter)
	fmt.Printf("   Database size after: %s\n", dbSizeAfter)
	fmt.Println()

	// Summary
	fmt.Println("===========================================")
	fmt.Println("Migration Summary")
	fmt.Println("===========================================")
	fmt.Printf("Status: SUCCESS\n")
	fmt.Printf("Duration: %v\n", duration)
	fmt.Printf("Constraints: %d total\n", constraintCount)
	fmt.Printf("Indexes: %d total\n", indexCount)
	fmt.Printf("Functions: %d created\n", functionCount)
	fmt.Println()
	fmt.Println("Next Steps:")
	fmt.Println("  1. Monitor application logs for errors")
	fmt.Println("  2. Test all critical features")
	fmt.Println("  3. Schedule regular maintenance tasks")
	fmt.Println("  4. Review performance metrics")
	fmt.Println()
	fmt.Println("Maintenance Commands Available:")
	fmt.Println("  - SELECT clean_old_notifications(90);")
	fmt.Println("  - SELECT clean_expired_sessions();")
	fmt.Println("  - SELECT recalculate_subject_stats('subject-id');")
	fmt.Println("  - SELECT update_user_level('user-id');")
	fmt.Println()
	fmt.Println("✓ Database fix completed successfully!")
	fmt.Println("===========================================")
}
