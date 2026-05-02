package db

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"sort"
	"time"

	"gorm.io/gorm"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

type migrationRecord struct {
	ID        string    `gorm:"primaryKey;column:id"`
	Checksum  string    `gorm:"not null;column:checksum"`
	AppliedAt time.Time `gorm:"not null;column:appliedAt"`
}

func (migrationRecord) TableName() string {
	return "schema_migrations"
}

// RunSQLMigrations applies idempotent SQL migrations under a PostgreSQL advisory lock.
// It is safe to run from one release job or a single application instance before rollout.
func RunSQLMigrations(database *gorm.DB) error {
	if database == nil {
		return nil
	}

	if err := database.Exec(`SELECT pg_advisory_lock(hashtext('thanawy_backend_schema_migrations'))`).Error; err != nil {
		return fmt.Errorf("acquire migration lock: %w", err)
	}
	defer func() {
		if err := database.Exec(`SELECT pg_advisory_unlock(hashtext('thanawy_backend_schema_migrations'))`).Error; err != nil {
			log.Printf("failed to release migration lock: %v", err)
		}
	}()

	if err := database.Exec(`
		CREATE TABLE IF NOT EXISTS "schema_migrations" (
			id text PRIMARY KEY,
			checksum text NOT NULL,
			"appliedAt" timestamptz NOT NULL DEFAULT now()
		)
	`).Error; err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrationFiles, "migrations")
	if err != nil {
		return fmt.Errorf("read migrations: %w", err)
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		id := name[:len(name)-len(filepath.Ext(name))]
		contents, err := migrationFiles.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}

		sum := sha256.Sum256(contents)
		checksum := hex.EncodeToString(sum[:])

		var existing migrationRecord
		err = database.First(&existing, "id = ?", id).Error
		if err == nil {
			if existing.Checksum != checksum {
				return fmt.Errorf("migration %s checksum changed after it was applied", id)
			}
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			return fmt.Errorf("check migration %s: %w", id, err)
		}

		log.Printf("Applying database migration %s", id)
		err = database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(contents)).Error; err != nil {
				return fmt.Errorf("apply migration %s: %w", id, err)
			}
			record := migrationRecord{ID: id, Checksum: checksum, AppliedAt: time.Now().UTC()}
			if err := tx.Create(&record).Error; err != nil {
				return fmt.Errorf("record migration %s: %w", id, err)
			}
			return nil
		})
		if err != nil {
			return err
		}
	}

	return nil
}
