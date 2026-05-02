package db

import (
	"log"
	"os"
	"strconv"
	"strings"
	"thanawy-backend/internal/models"
	"time"
	"unicode"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
	"gorm.io/plugin/dbresolver"
)

var DB *gorm.DB

// PrismaNamingStrategy implements GORM's NamingStrategy to match Prisma conventions:
// - Table names: PascalCase (e.g., "User", "Subject")
// - Column names: camelCase (e.g., "passwordHash", "createdAt")
type PrismaNamingStrategy struct {
	schema.NamingStrategy
}

func (PrismaNamingStrategy) TableName(table string) string {
	return table // Model name is already PascalCase
}

func (PrismaNamingStrategy) ColumnName(table, column string) string {
	// Convert PascalCase field name to camelCase column name
	// e.g., "PasswordHash" -> "passwordHash", "ID" -> "id"
	// Special handling for fields ending with "ID" (e.g., "TopicID" -> "topicId")
	if column == "ID" {
		return "id"
	}

	// Handle common acronyms (IP, ID, etc.) - convert to lowercase
	// Check if the column is all uppercase (like "IP")
	isAcronym := true
	for _, r := range column {
		if !unicode.IsUpper(r) && r != '_' {
			isAcronym = false
			break
		}
	}
	if isAcronym && len(column) > 1 {
		return strings.ToLower(column)
	}

	runes := []rune(column)
	if len(runes) > 0 {
		runes[0] = unicode.ToLower(runes[0])
	}
	// Handle "ID" suffix (e.g., TopicID -> topicId)
	if len(runes) >= 2 && runes[len(runes)-2] == 'I' && runes[len(runes)-1] == 'D' {
		runes[len(runes)-1] = 'd'
	}
	return string(runes)
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

	// Configure Read-Write splitting for massive scale
	replicas := os.Getenv("DATABASE_REPLICAS")
	var replicaDialectors []gorm.Dialector
	if replicas != "" {
		for _, replicaDSN := range strings.Split(replicas, ",") {
			replicaDialectors = append(replicaDialectors, postgres.Open(replicaDSN))
		}
	}

	// Register DBResolver with connection pool configuration
	// Default values are conservative to prevent connection pool explosion
	// In Kubernetes with 3 replicas, 50 connections per instance = 150 total
	// This is well within PostgreSQL's default max_connections (100)
	// and works well with PgBouncer
	maxIdleConns := 10
	maxOpenConns := 50
	connMaxLifetime := time.Hour
	connMaxIdleTime := 30 * time.Minute

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

// Migrate runs database migrations using AutoMigrate (for development only)
// Deprecated: Use golang-migrate for production
// MigrateWithLock runs database migrations.
// In production with Kubernetes, consider using an advisory lock to prevent race conditions.
func MigrateWithLock() error {
	return Migrate()
}

func cleanLegacyData(db *gorm.DB) {
	log.Println("Running Data Migration: Cleaning legacy plural tables...")
	tables := []string{"users", "subjects", "security_logs", "exams", "topics", "sub_topics", "enrollments", "lesson_progresses", "study_sessions", "tasks", "schedules", "reminders", "notifications", "payments", "invoices", "exam_results", "categories", "user_settings", "user_preferences"}
	for _, t := range tables {
		db.Exec("DROP TABLE IF EXISTS " + t + " CASCADE")
	}

	log.Println("Running Data Migration: Resolving duplicates before constraints...")
	// Remove duplicate UserSettings
	db.Exec(`DELETE FROM "UserSettings" WHERE id NOT IN (SELECT MIN(id) FROM "UserSettings" GROUP BY "userId")`)
	// Remove duplicate Enrollments
	db.Exec(`DELETE FROM "SubjectEnrollment" WHERE id NOT IN (SELECT MIN(id) FROM "SubjectEnrollment" GROUP BY "userId", "subjectId")`)
	// Remove duplicate LessonProgress
	db.Exec(`DELETE FROM "TopicProgress" WHERE id NOT IN (SELECT MIN(id) FROM "TopicProgress" GROUP BY "userId", "subTopicId")`)

	log.Println("Running Data Migration: Enforcing strict DB constraints...")
	// UserSettings Constraint
	db.Exec(`ALTER TABLE "UserSettings" DROP CONSTRAINT IF EXISTS unique_user_settings;`)
	db.Exec(`ALTER TABLE "UserSettings" ADD CONSTRAINT unique_user_settings UNIQUE ("userId");`)

	// SubjectEnrollment Constraint
	db.Exec(`ALTER TABLE "SubjectEnrollment" DROP CONSTRAINT IF EXISTS unique_user_subject;`)
	db.Exec(`ALTER TABLE "SubjectEnrollment" ADD CONSTRAINT unique_user_subject UNIQUE ("userId", "subjectId");`)

	// TopicProgress Constraint
	db.Exec(`ALTER TABLE "TopicProgress" DROP CONSTRAINT IF EXISTS unique_user_lesson;`)
	db.Exec(`ALTER TABLE "TopicProgress" ADD CONSTRAINT unique_user_lesson UNIQUE ("userId", "subTopicId");`)

	log.Println("Running Data Migration: Creating performance indexes...")
	// Performance Index for Notifications
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_notifications_user_created ON "Notification" ("userId", "createdAt" DESC);`)
}

// Migrate runs database migrations using AutoMigrate (for development only)
// Deprecated: Use golang-migrate for production
func Migrate() error {
	if DB == nil {
		return nil
	}
	if os.Getenv("DB_CLEANUP") == "true" {
		cleanLegacyData(DB)
	}
	log.Println("Running AutoMigrate (development only)...")
	return DB.AutoMigrate(
		&models.User{},
		&models.UserSettings{},
		&models.Category{},
		&models.Subject{},
		&models.Topic{},
		&models.SubTopic{},
		&models.Task{},
		&models.StudySession{},
		&models.Exam{},
		&models.Question{},
		&models.ExamResult{},
		&models.Payment{},
		&models.Invoice{},
		&models.Enrollment{},
		&models.LessonProgress{},
		&models.Schedule{},
		&models.Reminder{},
		&models.Notification{},
		&models.SecurityLog{},
		&models.UserSession{},
		&models.LessonAttachment{},
		&models.CourseReview{},
		&models.Achievement{},
		&models.Reward{},
		&models.Season{},
		&models.Challenge{},
		&models.Coupon{},
		&models.Automation{},
		&models.ABExperiment{},
		&models.BlogPost{},
		&models.ForumCategory{},
		&models.ForumTopic{},
		&models.Event{},
		&models.Book{},
		&models.AuditLog{},
		&models.SystemSetting{},
		&models.SubscriptionPlan{},
		&models.UserSubscription{},
	)
}
// Seed populates the database with initial data
func Seed() error {
	if DB == nil {
		return nil
	}

	log.Println("Seeding database...")

	// 1. Create default library categories
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

	// 2. Create default system settings
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

	return nil
}
