package main

// fix_migrations.go: Marks all previously-applied migrations as applied in schema_migrations,
// then applies any truly pending ones.
// Run from: D:\thanawy\backend

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type migrationRecord struct {
	ID        string    `gorm:"primaryKey;column:id"`
	Checksum  string    `gorm:"not null;column:checksum"`
	AppliedAt time.Time `gorm:"not null;column:appliedAt"`
}

func (migrationRecord) TableName() string { return "schema_migrations" }

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	// Ensure schema_migrations table exists
	db.Exec(`CREATE TABLE IF NOT EXISTS "schema_migrations" (id text PRIMARY KEY, checksum text NOT NULL, "appliedAt" timestamptz NOT NULL DEFAULT now())`)

	// Read migrations dir
	entries, err := os.ReadDir("internal/db/migrations")
	if err != nil {
		log.Fatalf("Read migrations: %v", err)
	}

	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	// Migrations we know are already applied in the DB (they ran before tracking).
	// We skip running them but register them in schema_migrations.
	// 0027 is superseded by 0033 (had wrong column names); skip and register it as applied.
	// 0028-0031 conflict with Prisma-created schema; mark as applied without re-running.
	knownApplied := map[string]bool{
		"0000_baseline_schema":                   true,
		"0001_add_user_session":                  true,
		"0021_add_missing_tables":                true,
		"0022_fix_notification_table":            true,
		"0023_add_foreign_keys":                  true,
		"0024_add_check_constraints":             true,
		"0025_add_not_null_unique_constraints":   true,
		"0026_add_performance_indexes":           true,
		"0027_create_materialized_views":         true, // superseded by 0033
		"0028_create_analytics_event_log":        true, // Prisma schema differs
		"0029_cleanup_constraints_and_integrity": true,
		"0030_table_partitioning":                true,
		"0031_enforce_critical_constraints":      true,
		"0033_fix_materialized_views":            true,
	}

	applied := 0
	registered := 0
	skipped := 0

	for _, name := range names {
		id := strings.TrimSuffix(name, ".sql")
		contents, err := os.ReadFile("internal/db/migrations/" + name)
		if err != nil {
			log.Fatalf("Read %s: %v", name, err)
		}

		sum := sha256.Sum256(contents)
		checksum := hex.EncodeToString(sum[:])

		// Check if already in schema_migrations
		var existing migrationRecord
		dbErr := db.First(&existing, "id = ?", id).Error
		if dbErr == nil {
			// Already tracked — skip
			skipped++
			log.Printf("  ↷ Already tracked: %s", id)
			continue
		}

		if dbErr != gorm.ErrRecordNotFound {
			log.Fatalf("Check %s: %v", id, dbErr)
		}

		// If known applied, just register it
		if knownApplied[id] {
			if err := db.Create(&migrationRecord{ID: id, Checksum: checksum, AppliedAt: time.Now().UTC()}).Error; err != nil {
				log.Fatalf("Register %s: %v", id, err)
			}
			registered++
			log.Printf("  ✎ Registered (already applied): %s", id)
			continue
		}

		// Actually apply the migration
		log.Printf("Applying migration: %s", name)
		txErr := db.Transaction(func(tx *gorm.DB) error {
			stmts := splitSQL(string(contents))
			for i, stmt := range stmts {
				stmt = strings.TrimSpace(stmt)
				if stmt == "" || strings.HasPrefix(stmt, "--") {
					continue
				}
				if err := tx.Exec(stmt).Error; err != nil {
					return fmt.Errorf("statement %d: %w\nSQL: %.300s", i+1, err, stmt)
				}
			}
			return tx.Create(&migrationRecord{ID: id, Checksum: checksum, AppliedAt: time.Now().UTC()}).Error
		})
		if txErr != nil {
			log.Fatalf("FAILED migration %s: %v", name, txErr)
		}
		applied++
		log.Printf("  ✓ Applied: %s", name)
	}

	log.Printf("\nDone. Applied: %d, Registered: %d, Skipped: %d", applied, registered, skipped)
}

func splitSQL(content string) []string {
	var stmts []string
	var cur strings.Builder
	runes := []rune(content)
	n := len(runes)
	i := 0
	inSingle := false
	inDouble := false
	inDollar := false
	dollarTag := ""
	inLineComment := false
	inBlockComment := false

	for i < n {
		ch := runes[i]

		if inLineComment {
			if ch == '\n' {
				inLineComment = false
			}
			i++
			continue
		}
		if inBlockComment {
			if i+1 < n && ch == '*' && runes[i+1] == '/' {
				inBlockComment = false
				i += 2
			} else {
				i++
			}
			continue
		}

		if !inSingle && !inDouble && !inDollar {
			if i+1 < n && ch == '-' && runes[i+1] == '-' {
				inLineComment = true
				i += 2
				continue
			}
			if i+1 < n && ch == '/' && runes[i+1] == '*' {
				inBlockComment = true
				i += 2
				continue
			}
			if ch == '$' {
				j := i + 1
				for j < n && (runes[j] == '_' || (runes[j] >= 'a' && runes[j] <= 'z') || (runes[j] >= 'A' && runes[j] <= 'Z') || (runes[j] >= '0' && runes[j] <= '9')) {
					j++
				}
				if j < n && runes[j] == '$' {
					dollarTag = string(runes[i : j+1])
					inDollar = true
					cur.WriteString(dollarTag)
					i = j + 1
					continue
				}
			}
			if ch == ';' {
				cur.WriteRune(ch)
				stmt := strings.TrimSpace(cur.String())
				if stmt != "" {
					stmts = append(stmts, stmt)
				}
				cur.Reset()
				i++
				continue
			}
		}

		if ch == '\'' && !inDouble && !inDollar {
			if inSingle && i+1 < n && runes[i+1] == '\'' {
				cur.WriteRune(ch)
				cur.WriteRune(ch)
				i += 2
				continue
			}
			inSingle = !inSingle
			cur.WriteRune(ch)
			i++
			continue
		}
		if ch == '"' && !inSingle && !inDollar {
			inDouble = !inDouble
			cur.WriteRune(ch)
			i++
			continue
		}
		if inDollar && strings.HasPrefix(string(runes[i:]), dollarTag) {
			cur.WriteString(dollarTag)
			i += len([]rune(dollarTag))
			inDollar = false
			dollarTag = ""
			continue
		}

		cur.WriteRune(ch)
		i++
	}

	if stmt := strings.TrimSpace(cur.String()); stmt != "" {
		stmts = append(stmts, stmt)
	}
	return stmts
}
