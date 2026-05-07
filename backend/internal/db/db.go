package db

import (
	"log"
	"os"
	"strconv"
	"strings"
	"thanawy-backend/internal/models"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
	"gorm.io/plugin/dbresolver"
)

var DB *gorm.DB

// PrismaNamingStrategy implements GORM's NamingStrategy to match Prisma conventions:
// - Table names: PascalCase (e.g., "User", "Subject")
// - Column names: snake_case (matching recent migrations)
type PrismaNamingStrategy struct {
	schema.NamingStrategy
}

func (PrismaNamingStrategy) TableName(table string) string {
	return table // Model name is already PascalCase
}

func Connect(dsn string) (*gorm.DB, error) {
	logMode := logger.Warn
	if os.Getenv("DB_LOG_LEVEL") == "info" {
		logMode = logger.Info
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.New(log.New(os.Stdout, "\r\n", log.LstdFlags), logger.Config{
			SlowThreshold:             500 * time.Millisecond,
			LogLevel:                  logMode,
			IgnoreRecordNotFoundError: true,
			ParameterizedQueries:      true,
		}),
		PrepareStmt:    true, // Enable prepared statement cache for performance
		NamingStrategy: PrismaNamingStrategy{},
	})

	if err != nil {
		return nil, err
	}

	if os.Getenv("DB_DEBUG") == "true" {
		db = db.Debug()
	}

	// Configure Read-Write splitting for massive scale
	replicas := os.Getenv("DATABASE_REPLICAS")
	var replicaDialectors []gorm.Dialector
	if replicas != "" {
		for _, replicaDSN := range strings.Split(replicas, ",") {
			replicaDialectors = append(replicaDialectors, postgres.Open(replicaDSN))
		}
	}

	// Register DBResolver with connection pool configuration
	// Tuned for production scalability
	// These values should be adjusted based on deployment environment
	// For 1K concurrent users: ~200 connections recommended
	// For 10K concurrent users: ~500 connections or implement PgBouncer
	maxIdleConns := 20                 // Increased from 10 for better concurrency
	maxOpenConns := 200                // Increased from 50 to handle 1K+ concurrent users
	connMaxLifetime := 5 * time.Minute // Refreshed more frequently
	connMaxIdleTime := 2 * time.Minute // Close idle connections faster

	// Allow override via environment variables
	if v := os.Getenv("DB_MAX_IDLE_CONNS"); v != "" {
		if val, err := strconv.Atoi(v); err == nil && val > 0 {
			maxIdleConns = val
		}
	}
	if v := os.Getenv("DB_MAX_OPEN_CONNS"); v != "" {
		if val, err := strconv.Atoi(v); err == nil && val > 0 {
			maxOpenConns = val
		}
	}
	if v := os.Getenv("DB_CONN_MAX_LIFETIME_MINUTES"); v != "" {
		if val, err := strconv.Atoi(v); err == nil && val > 0 {
			connMaxLifetime = time.Duration(val) * time.Minute
		}
	}
	if v := os.Getenv("DB_CONN_MAX_IDLE_MINUTES"); v != "" {
		if val, err := strconv.Atoi(v); err == nil && val > 0 {
			connMaxIdleTime = time.Duration(val) * time.Minute
		}
	}

	log.Printf("Database connection pool settings: MaxIdleConns=%d, MaxOpenConns=%d, ConnMaxLifetime=%s, ConnMaxIdleTime=%s", maxIdleConns, maxOpenConns, connMaxLifetime, connMaxIdleTime)

	resolver := dbresolver.Register(dbresolver.Config{
		Sources:  []gorm.Dialector{postgres.Open(dsn)},
		Replicas: replicaDialectors,
		Policy:   dbresolver.RandomPolicy{}, // Load balance between replicas
	}).
		SetMaxIdleConns(maxIdleConns).
		SetMaxOpenConns(maxOpenConns).
		SetConnMaxLifetime(connMaxLifetime).
		SetConnMaxIdleTime(connMaxIdleTime)

	err = db.Use(resolver)
	if err != nil {
		return nil, err
	}

	// Prometheus monitoring removed to avoid memory issues
	// To enable: import "gorm.io/plugin/prometheus" and uncomment below
	/*
		pgCollector := &prometheus.Postgres{VariableNames: []string{"Threads_running"}}
		db.Use(prometheus.New(prometheus.Config{
			DBName:          "thanawy_main",
			RefreshInterval: 15,
			MetricsCollector: []prometheus.MetricsCollector{pgCollector},
		}))
	*/

	DB = db
	log.Printf("Database connection established with Read-Write splitting and Monitoring.")

	// Create cuid function if it doesn't exist (compatibility with Prisma migrations)
	db.Exec(`
		CREATE OR REPLACE FUNCTION cuid() RETURNS text AS $$
		BEGIN
			RETURN (
				'c' || 
				substring(extract(epoch from now())::text from 1 for 8) || 
				substring(md5(random()::text) from 1 for 16)
			);
		END;
		$$ LANGUAGE plpgsql;
	`)

	log.Println("Database ready. Schema changes are controlled by explicit migration flags.")

	return db, nil
}



// Seed populates the database with initial data
func Seed() error {
	if DB == nil {
		return nil
	}

	log.Println("Seeding database...")

	// Helper function to check if table exists
	tableExists := func(tableName string) bool {
		var count int64
		result := DB.Raw(`
			SELECT COUNT(*) FROM information_schema.tables 
			WHERE table_schema = 'public' AND table_name = ?
		`, tableName).Scan(&count)
		return result.Error == nil && count > 0
	}

	// 1. Create default library categories (skip if Category table doesn't exist)
	if !tableExists("Category") {
		log.Println("Category table not found, skipping category seeding")
	} else {
		libraryCategories := []models.Category{
			{Name: "كتب مدرسية", Slug: "textbooks", Type: models.CategoryTypeLibrary},
			{Name: "ملخصات", Slug: "summaries", Type: models.CategoryTypeLibrary},
			{Name: "مراجعات نهائية", Slug: "final-reviews", Type: models.CategoryTypeLibrary},
			{Name: "أسئلة واختبارات", Slug: "questions-and-exams", Type: models.CategoryTypeLibrary},
		}

		for _, cat := range libraryCategories {
			var existing models.Category
			if err := DB.Where("slug = ? AND type = ?", cat.Slug, cat.Type).First(&existing).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					DB.Create(&cat)
					log.Printf("Created library category: %s", cat.Name)
				}
			}
		}
	}

	// 2. Create default system settings (skip if SystemSetting table doesn't exist)
	if !tableExists("SystemSetting") {
		log.Println("SystemSetting table not found, skipping settings seeding")
	} else {
		var settings models.SystemSetting
		if err := DB.Where("key = ?", "admin_settings").First(&settings).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				defaultSettings := `{"siteName":"Thanawy","siteDescription":"منصة تعليمية لإدارة التعلم والمحتوى.","features":{"registration":true,"emailVerification":true,"engagement":true,"forum":true,"blog":true,"events":true,"aiAssistant":true}}`
				DB.Create(&models.SystemSetting{
					Key:   "admin_settings",
					Value: defaultSettings,
				})
				log.Println("Created default admin settings")
			}
		}
	}

	// 3. Create default admin user (skip if User table doesn't exist)
	if !tableExists("User") {
		log.Println("User table not found, skipping admin user seeding")
	} else {
		email := "admin@thanawy.app"
		password := "Admin@123456"
		var admin models.User
		if err := DB.Unscoped().Where("email = ?", email).First(&admin).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), 12)
				admin = models.User{
					Email:        email,
					PasswordHash: string(hashedPassword),
					Role:         models.RoleAdmin,
					Status:       models.StatusActive,
				}
				DB.Create(&admin)
				log.Printf("Created default admin user: %s", email)
			}
		} else {
			// Admin already exists, do nothing to avoid resetting manual changes
			log.Printf("Default admin user already exists: %s", email)
		}
	}

	return nil
}
