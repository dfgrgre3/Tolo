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
	"strings"
	"time"
	"unicode"

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

// splitSQLStatements splits a SQL migration file into individual statements.
// It properly handles:
// - Dollar-quoted strings ($$...$$, $tag$...$tag$)
// - Single and double quoted strings
// - Line and block comments
// - Statements ending with semicolons
func splitSQLStatements(contents string) []string {
	var statements []string
	var current strings.Builder

	inSingleQuote := false
	inDoubleQuote := false
	dollarTag := ""
	inDollarQuote := false
	inLineComment := false
	inBlockComment := false

	runes := []rune(contents)
	i := 0
	for i < len(runes) {
		ch := runes[i]

		// Handle line comments --
		if !inSingleQuote && !inDoubleQuote && !inDollarQuote && !inBlockComment {
			if ch == '-' && i+1 < len(runes) && runes[i+1] == '-' {
				inLineComment = true
				i += 2
				continue
			}
			if inLineComment && ch == '\n' {
				inLineComment = false
				i++
				continue
			}
		}

		// Handle block comments /* */
		if !inSingleQuote && !inDoubleQuote && !inDollarQuote && !inLineComment {
			if ch == '/' && i+1 < len(runes) && runes[i+1] == '*' && !inBlockComment {
				inBlockComment = true
				i += 2
				continue
			}
			if inBlockComment && ch == '*' && i+1 < len(runes) && runes[i+1] == '/' {
				inBlockComment = false
				i += 2
				continue
			}
		}

		// Skip if in any comment
		if inLineComment || inBlockComment {
			i++
			continue
		}

		// Handle single quotes
		if ch == '\'' && !inDoubleQuote && !inDollarQuote {
			// Check for escaped quote ''
			if inSingleQuote && i+1 < len(runes) && runes[i+1] == '\'' {
				current.WriteRune(ch)
				i += 2
				continue
			}
			inSingleQuote = !inSingleQuote
			current.WriteRune(ch)
			i++
			continue
		}

		// Handle double quotes
		if ch == '"' && !inSingleQuote && !inDollarQuote {
			inDoubleQuote = !inDoubleQuote
			current.WriteRune(ch)
			i++
			continue
		}

		// Handle dollar-quoted strings ($$ or $tag$)
		if ch == '$' && !inSingleQuote && !inDoubleQuote {
			if inDollarQuote {
				// Check if this closes the current dollar quote
				if strings.HasPrefix(string(runes[i:]), dollarTag) {
					current.WriteString(dollarTag)
					i += len([]rune(dollarTag))
					inDollarQuote = false
					dollarTag = ""
					continue
				}
			} else {
				// Look for the end of this dollar tag
				j := i + 1
				for j < len(runes) && (unicode.IsLetter(runes[j]) || unicode.IsDigit(runes[j]) || runes[j] == '_') {
					j++
				}
				if j < len(runes) && runes[j] == '$' {
					dollarTag = string(runes[i : j+1])
					inDollarQuote = true
					current.WriteString(dollarTag)
					i = j + 1
					continue
				}
			}
		}

		// Handle statement terminator
		if ch == ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote {
			current.WriteRune(ch)
			stmt := strings.TrimSpace(current.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
			i++
			continue
		}

		current.WriteRune(ch)
		i++
	}

	// Handle last statement without semicolon (e.g., final statement)
	if current.Len() > 0 {
		stmt := strings.TrimSpace(current.String())
		if stmt != "" {
			statements = append(statements, stmt)
		}
	}

	return statements
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
		
		if len(contents) == 0 {
			log.Printf("Skipping empty migration file %s", name)
			continue
		}

		sum := sha256.Sum256(contents)
		checksum := hex.EncodeToString(sum[:])

		var existing migrationRecord
		err = database.First(&existing, "id = ?", id).Error
		if err == nil {
			if existing.Checksum != checksum {
				return fmt.Errorf("migration %s checksum mismatch: applied checksum %s, file checksum %s. Do not edit applied migrations; create a new migration instead.", id, existing.Checksum, checksum)
			}
			continue
		}
		if err != nil && err != gorm.ErrRecordNotFound {
			return fmt.Errorf("check migration %s: %w", id, err)
		}

		// If this is a baseline migration, check if the database already has tables.
		// If it does, we skip applying the baseline and just record it as applied.
		if strings.Contains(id, "baseline") {
			var migrationCount int64
			database.Model(&migrationRecord{}).Count(&migrationCount)
			
			var userTableExists int64
			database.Raw(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'`).Scan(&userTableExists)

			if userTableExists > 0 || migrationCount > 0 {
				log.Printf("Existing database detected. Marking baseline migration %s as applied without executing.", id)
				record := migrationRecord{ID: id, Checksum: checksum, AppliedAt: time.Now().UTC()}
				if err := database.Create(&record).Error; err != nil {
					return fmt.Errorf("record baseline migration %s: %w", id, err)
				}
				continue
			}
		}

		log.Printf("Applying database migration %s", id)
		err = database.Transaction(func(tx *gorm.DB) error {
			// Split and execute statements individually to avoid prepared statement limitations
			statements := splitSQLStatements(string(contents))
			if len(statements) == 0 {
				log.Printf("Warning: migration %s contains no executable statements", id)
			}

			for i, stmt := range statements {
				if stmt == "" {
					continue
				}
				// Skip pure comments or whitespace-only statements
				trimmed := strings.TrimSpace(stmt)
				if trimmed == "" || strings.HasPrefix(trimmed, "--") {
					continue
				}

				if err := tx.Exec(stmt).Error; err != nil {
					return fmt.Errorf("apply migration %s statement %d: %w\nStatement: %.200s", id, i+1, err, stmt)
				}
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
