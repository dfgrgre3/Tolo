package db

import (
	"log"
	"os"
	"strings"
	"thanawy-backend/internal/models"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/plugin/dbresolver"
	"gorm.io/plugin/prometheus"
)

var DB *gorm.DB

func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
		PrepareStmt: true, // Enable prepared statement cache for performance
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

	// Register DBResolver
	err = db.Use(dbresolver.Register(dbresolver.Config{
		Sources:  []gorm.Dialector{postgres.Open(dsn)},
		Replicas: replicaDialectors,
		Policy:   dbresolver.RandomPolicy{}, // Load balance between replicas
	}).
		SetMaxIdleConns(100).
		SetMaxOpenConns(1000). // Increased for higher concurrency
		SetConnMaxLifetime(time.Hour).
		SetConnMaxIdleTime(30 * time.Minute))

	if err != nil {
		return nil, err
	}

	// Register Prometheus monitoring
	db.Use(prometheus.New(prometheus.Config{
		DBName:          "thanawy_main",
		RefreshInterval: 15,
		MetricsCollector: []prometheus.MetricsCollector{
			&prometheus.Postgres{VariableNames: []string{"Threads_running"}},
		},
	}))

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

	// Note: AutoMigrate removed for production use
	// Use migration tool (golang-migrate) instead
	// Run: migrate -path backend/migrations -database "$(DATABASE_URL)" up
	log.Println("Database ready. Please use migration tool for schema changes.")

	return db, nil
}

// Migrate runs database migrations using AutoMigrate (for development only)
// Deprecated: Use golang-migrate for production
func Migrate() error {
	if DB == nil {
		return nil
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
	)
}
