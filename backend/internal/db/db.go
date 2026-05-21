package db

import (
	"fmt"
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
	return ConnectWithWriteDSN(dsn, os.Getenv("DATABASE_WRITE_DSN"))
}

func ConnectWithWriteDSN(dsn, writeDSN string) (*gorm.DB, error) {
	logMode := getGormLogLevel()

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

	if os.Getenv("DB_DEBUG") == "true" && os.Getenv("NODE_ENV") != "production" {
		db = db.Debug()
	}

	sourceDSN := dsn
	if writeDSN != "" {
		sourceDSN = writeDSN
	}

	replicaDialectors := getReplicaDialectors()
	pool := getPoolSettings()

	log.Printf("Database connection pool settings: MaxIdleConns=%d, MaxOpenConns=%d, ConnMaxLifetime=%s, ConnMaxIdleTime=%s",
		pool.MaxIdleConns, pool.MaxOpenConns, pool.MaxLifetime, pool.MaxIdleTime)

	var replicas []gorm.Dialector
	if len(replicaDialectors) > 0 {
		replicas = replicaDialectors
	} else {
		replicas = []gorm.Dialector{postgres.Open(dsn)}
	}

	// Register DBResolver with explicit source/replica splitting for CQRS
	resolver := dbresolver.Register(dbresolver.Config{
		Sources:  []gorm.Dialector{postgres.Open(sourceDSN)},
		Replicas: replicas,
		Policy:   dbresolver.RandomPolicy{},
	}).
		SetMaxIdleConns(pool.MaxIdleConns).
		SetMaxOpenConns(pool.MaxOpenConns).
		SetConnMaxLifetime(pool.MaxLifetime).
		SetConnMaxIdleTime(pool.MaxIdleTime)

	if err := db.Use(resolver); err != nil {
		return nil, err
	}

	DB = db
	log.Printf("Database connection established with Read-Write splitting and Monitoring.")

	setupDatabaseFunctions(db)

	log.Println("Database ready. Schema changes are controlled by explicit migration flags.")

	return db, nil
}

// ReadDB returns a GORM session explicitly routed to a read replica.
// Use this in all query (read) handlers to enforce CQRS read path.
func ReadDB() *gorm.DB {
	if DB == nil {
		return nil
	}
	return DB.Session(&gorm.Session{}).Clauses(dbresolver.Read)
}

// WriteDB returns a GORM session explicitly routed to the write source.
// Use this in all command (write) handlers to enforce CQRS write path.
func WriteDB() *gorm.DB {
	if DB == nil {
		return nil
	}
	return DB.Session(&gorm.Session{}).Clauses(dbresolver.Write)
}

// WithWriteTx executes fn within a write-routed transaction.
// This guarantees all operations in fn go to the write source.
func WithWriteTx(fn func(tx *gorm.DB) error) error {
	if DB == nil {
		return fmt.Errorf("database connection is not initialized")
	}
	return DB.Session(&gorm.Session{}).Clauses(dbresolver.Write).Transaction(fn)
}

func getGormLogLevel() logger.LogLevel {
	if os.Getenv("DB_LOG_LEVEL") == "info" && os.Getenv("NODE_ENV") != "production" {
		return logger.Info
	}
	return logger.Warn
}

func getReplicaDialectors() []gorm.Dialector {
	replicas := os.Getenv("DATABASE_REPLICAS")
	var replicaDialectors []gorm.Dialector
	if replicas != "" {
		for _, replicaDSN := range strings.Split(replicas, ",") {
			replicaDialectors = append(replicaDialectors, postgres.Open(replicaDSN))
		}
	}
	return replicaDialectors
}

type poolSettings struct {
	MaxIdleConns int
	MaxOpenConns int
	MaxLifetime  time.Duration
	MaxIdleTime  time.Duration
}

func getPoolSettings() poolSettings {
	settings := poolSettings{
		MaxIdleConns: 20,
		MaxOpenConns: 200,
		MaxLifetime:  5 * time.Minute,
		MaxIdleTime:  2 * time.Minute,
	}

	if v, val := getEnvInt("DB_MAX_IDLE_CONNS"); v {
		settings.MaxIdleConns = val
	}
	if v, val := getEnvInt("DB_MAX_OPEN_CONNS"); v {
		settings.MaxOpenConns = val
	}
	if v, val := getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES"); v {
		settings.MaxLifetime = time.Duration(val) * time.Minute
	}
	if v, val := getEnvInt("DB_CONN_MAX_IDLE_MINUTES"); v {
		settings.MaxIdleTime = time.Duration(val) * time.Minute
	}

	return settings
}

func getEnvInt(key string) (bool, int) {
	if v := os.Getenv(key); v != "" {
		if val, err := strconv.Atoi(v); err == nil && val > 0 {
			return true, val
		}
	}
	return false, 0
}

func setupDatabaseFunctions(db *gorm.DB) {
	// Create cuid function if it doesn't exist (compatibility with Prisma migrations)
	db.Exec(`
		CREATE OR REPLACE FUNCTION cuid() RETURNS text AS $$
		BEGIN
			RETURN (
				'c' ||
				to_char(extract(epoch from now())::bigint, 'FM0000000000000000') ||
				substring(md5(random()::text || clock_timestamp()::text) from 1 for 16)
			);
		END;
		$$ LANGUAGE plpgsql;
	`)
}

// Seed populates the database with initial data
func Seed() error {
	if DB == nil {
		return nil
	}
	log.Println("Seeding database...")

	seedCategories()
	seedSystemSettings()
	return seedAdminUser()
}

func tableExists(tableName string) bool {
	var count int64
	result := DB.Raw(`
		SELECT COUNT(*) FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_name = ?
	`, tableName).Scan(&count)
	return result.Error == nil && count > 0
}

func seedCategories() {
	if !tableExists("Category") {
		log.Println("Category table not found, skipping category seeding")
		return
	}

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

func seedSystemSettings() {
	if !tableExists("SystemSetting") {
		log.Println("SystemSetting table not found, skipping settings seeding")
		return
	}

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

func seedAdminUser() error {
	if !tableExists("User") {
		log.Println("User table not found, skipping admin user seeding")
		return nil
	}

	email := os.Getenv("DEFAULT_ADMIN_EMAIL")
	if email == "" {
		email = "admin@thanawy.app"
	}

	password := os.Getenv("DEFAULT_ADMIN_PASSWORD")
	if password == "" {
		log.Println("WARNING: DEFAULT_ADMIN_PASSWORD not set. Skipping default admin user creation.")
		return nil
	}

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
		return nil
	}

	log.Printf("Default admin user already exists: %s", email)
	return nil
}
