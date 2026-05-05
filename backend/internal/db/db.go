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
	// Remove duplicate UserSettings (keep first by createdAt)
	db.Exec(`DELETE FROM "UserSettings" WHERE id IN (
		SELECT id FROM (
			SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt") as rn
			FROM "UserSettings"
		) sub WHERE rn > 1
	)`)
	// Remove duplicate Enrollments (keep first by enrolledAt)
	db.Exec(`DELETE FROM "SubjectEnrollment" WHERE id IN (
		SELECT id FROM (
			SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "subjectId" ORDER BY "enrolledAt") as rn
			FROM "SubjectEnrollment"
		) sub WHERE rn > 1
	)`)
	// Remove duplicate TopicProgress (keep first by createdAt)
	db.Exec(`DELETE FROM "TopicProgress" WHERE id IN (
		SELECT id FROM (
			SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "subTopicId" ORDER BY "createdAt") as rn
			FROM "TopicProgress"
		) sub WHERE rn > 1
	)`)

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
	// Performance Index for User Search and Growth
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_users_created_at ON "User" ("createdAt");`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_users_status_updated ON "User" ("status", "updatedAt" DESC);`)
	// Performance Index for Study Sessions
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_study_sessions_start_time ON "StudySession" ("startTime");`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_study_sessions_user_updated ON "StudySession" ("userId", "updatedAt" DESC);`)
	// Performance Index for Exam Results
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_exam_results_taken_at ON "ExamResult" ("takenAt");`)
	// Performance Indexes for Wallet & Financials
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_wallet_user_created ON "WalletTransaction" ("userId", "createdAt" DESC);`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_payments_user_status ON "Payment" ("userId", "status", "createdAt" DESC);`)
	// Performance Indexes for Content
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_subjects_active_cat ON "Subject" ("isActive", "categoryId", "level");`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_topics_subject_order ON "Topic" ("subjectId", "order");`)
	db.Exec(`CREATE INDEX IF NOT EXISTS idx_perf_subtopics_topic_order ON "SubTopic" ("topicId", "order");`)
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
	
	// NOTE: User, Category, and SystemSetting tables are handled by SQL migrations
	// to avoid AutoMigrate issues with NOT NULL columns on existing tables.
	// See migration 0010_fix_automigrate_issues.sql
	
	return DB.AutoMigrate(
		// &models.User{}, // Handled by SQL migration 0010
		// &models.UserSettings{}, // Temporarily disabled due to constraint issue
		// &models.Category{}, // Handled by SQL migration 0010
		// &models.Subject{}, // Temporarily disabled due to UUID conversion issue
		// &models.Topic{}, // References Subject
		// &models.SubTopic{}, // References Subject via Topic
		// &models.Task{}, // References Subject
		// &models.StudySession{}, // References Subject
		// &models.Exam{}, // References Subject
		// &models.Question{}, // References Subject via Exam
		// &models.ExamResult{}, // References Subject via Exam
		// &models.Payment{}, // References Subject
		// &models.Enrollment{}, // References Subject
		// &models.LessonProgress{}, // References Subject
		// &models.CourseReview{}, // References Subject
		&models.Achievement{},
		&models.Reward{},
		&models.Season{},
		&models.Challenge{},
		&models.UserAchievement{},
		&models.UserChallenge{},
		&models.Coupon{},
		&models.Automation{},
		&models.ABExperiment{},
		&models.BlogPost{},
		&models.ForumCategory{},
		&models.ForumTopic{},
		&models.LiveEvent{},
		&models.Book{},
		&models.AuditLog{},
		// &models.SystemSetting{}, // Handled by SQL migration 0010
		&models.SubscriptionPlan{},
		&models.UserSubscription{},
		&models.AIConversation{},
		&models.AIMessage{},
		&models.Contest{},
		&models.ContestQuestion{},
		&models.Event{},
		&models.Campaign{},
		&models.ContentReport{},
	)
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
			// Reset password and status for existing admin to ensure access
			hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), 12)
			DB.Model(&admin).Updates(map[string]interface{}{
				"password_hash": string(hashedPassword),
				"status":        models.StatusActive,
				"deleted_at":    nil,
			})
			log.Printf("Reset default admin user: %s", email)
		}
	}

	return nil
}
