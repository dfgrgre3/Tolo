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
	splitter := &sqlSplitter{
		runes: []rune(contents),
	}
	return splitter.split()
}

type sqlSplitter struct {
	runes          []rune
	i              int
	statements     []string
	current        strings.Builder
	inSingleQuote  bool
	inDoubleQuote  bool
	inDollarQuote  bool
	dollarTag      string
	inLineComment  bool
	inBlockComment bool
}

func (s *sqlSplitter) split() []string {
	for s.i < len(s.runes) {
		if s.handleComments() {
			continue
		}
		if s.handleQuotes() {
			continue
		}
		if s.handleDollarQuotes() {
			continue
		}
		if s.handleTerminator() {
			continue
		}

		s.current.WriteRune(s.runes[s.i])
		s.i++
	}

	s.finalize()
	return s.statements
}

func (s *sqlSplitter) inAnyQuote() bool {
	return s.inSingleQuote || s.inDoubleQuote || s.inDollarQuote
}

func (s *sqlSplitter) handleComments() bool {
	if s.inAnyQuote() {
		return false
	}

	if s.inLineComment {
		if s.runes[s.i] == '\n' {
			s.inLineComment = false
		}
		s.i++
		return true
	}

	if s.inBlockComment {
		if s.i+1 < len(s.runes) && s.runes[s.i] == '*' && s.runes[s.i+1] == '/' {
			s.inBlockComment = false
			s.i += 2
		} else {
			s.i++
		}
		return true
	}

	if s.i+1 < len(s.runes) {
		if s.runes[s.i] == '-' && s.runes[s.i+1] == '-' {
			s.inLineComment = true
			s.i += 2
			return true
		}
		if s.runes[s.i] == '/' && s.runes[s.i+1] == '*' {
			s.inBlockComment = true
			s.i += 2
			return true
		}
	}

	return false
}

func (s *sqlSplitter) handleQuotes() bool {
	ch := s.runes[s.i]
	if ch == '\'' && !s.inDoubleQuote && !s.inDollarQuote {
		if s.inSingleQuote && s.i+1 < len(s.runes) && s.runes[s.i+1] == '\'' {
			s.current.WriteRune(ch)
			s.i += 2
			return true
		}
		s.inSingleQuote = !s.inSingleQuote
		s.current.WriteRune(ch)
		s.i++
		return true
	}

	if ch == '"' && !s.inSingleQuote && !s.inDollarQuote {
		s.inDoubleQuote = !s.inDoubleQuote
		s.current.WriteRune(ch)
		s.i++
		return true
	}

	return false
}

func (s *sqlSplitter) handleDollarQuotes() bool {
	if s.inSingleQuote || s.inDoubleQuote {
		return false
	}

	ch := s.runes[s.i]
	if ch != '$' {
		return false
	}

	if s.inDollarQuote {
		if strings.HasPrefix(string(s.runes[s.i:]), s.dollarTag) {
			s.current.WriteString(s.dollarTag)
			s.i += len([]rune(s.dollarTag))
			s.inDollarQuote = false
			s.dollarTag = ""
			return true
		}
		return false
	}

	// Look for the end of this dollar tag
	j := s.i + 1
	for j < len(s.runes) && (unicode.IsLetter(s.runes[j]) || unicode.IsDigit(s.runes[j]) || s.runes[j] == '_') {
		j++
	}
	if j < len(s.runes) && s.runes[j] == '$' {
		s.dollarTag = string(s.runes[s.i : j+1])
		s.inDollarQuote = true
		s.current.WriteString(s.dollarTag)
		s.i = j + 1
		return true
	}

	return false
}

func (s *sqlSplitter) handleTerminator() bool {
	if s.inAnyQuote() {
		return false
	}

	if s.runes[s.i] == ';' {
		s.current.WriteRune(';')
		s.addStatement()
		s.current.Reset()
		s.i++
		return true
	}

	return false
}

func (s *sqlSplitter) addStatement() {
	stmt := strings.TrimSpace(s.current.String())
	if stmt != "" {
		s.statements = append(s.statements, stmt)
	}
}

func (s *sqlSplitter) finalize() {
	s.addStatement()
}


func RunSQLMigrations(database *gorm.DB) error {
	if database == nil {
		return nil
	}

	if err := database.Exec(`SELECT pg_advisory_lock(hashtext('thanawy_backend_schema_migrations'))`).Error; err != nil {
		return fmt.Errorf("acquire migration lock: %w", err)
	}
	defer releaseMigrationLock(database)

	if err := ensureMigrationTable(database); err != nil {
		return err
	}

	names, err := getMigrationNames()
	if err != nil {
		return err
	}

	for _, name := range names {
		if err := applyMigration(database, name); err != nil {
			return err
		}
	}

	return nil
}

func releaseMigrationLock(database *gorm.DB) {
	if err := database.Exec(`SELECT pg_advisory_unlock(hashtext('thanawy_backend_schema_migrations'))`).Error; err != nil {
		log.Printf("failed to release migration lock: %v", err)
	}
}

func ensureMigrationTable(database *gorm.DB) error {
	err := database.Exec(`
		CREATE TABLE IF NOT EXISTS "schema_migrations" (
			id text PRIMARY KEY,
			checksum text NOT NULL,
			"appliedAt" timestamptz NOT NULL DEFAULT now()
		)
	`).Error
	if err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}
	return nil
}

func getMigrationNames() ([]string, error) {
	entries, err := fs.ReadDir(migrationFiles, "migrations")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)
	return names, nil
}

func applyMigration(database *gorm.DB, name string) error {
	id := name[:len(name)-len(filepath.Ext(name))]
	contents, err := migrationFiles.ReadFile("migrations/" + name)
	if err != nil {
		return fmt.Errorf("read migration %s: %w", name, err)
	}

	if len(contents) == 0 {
		log.Printf("Skipping empty migration file %s", name)
		return nil
	}

	sum := sha256.Sum256(contents)
	checksum := hex.EncodeToString(sum[:])

	var existing migrationRecord
	err = database.First(&existing, "id = ?", id).Error
	if err == nil {
		if existing.Checksum != checksum {
			return fmt.Errorf("migration %s checksum mismatch: applied checksum %s, file checksum %s. Do not edit applied migrations; create a new migration instead.", id, existing.Checksum, checksum)
		}
		return nil
	}

	if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("check migration %s: %w", id, err)
	}

	if strings.Contains(id, "baseline") && shouldSkipBaseline(database) {
		log.Printf("Existing database detected. Marking baseline migration %s as applied without executing.", id)
		return database.Create(&migrationRecord{ID: id, Checksum: checksum, AppliedAt: time.Now().UTC()}).Error
	}

	log.Printf("Applying database migration %s", id)
	return database.Transaction(func(tx *gorm.DB) error {
		return executeMigrationStatements(tx, id, string(contents), checksum)
	})
}

func shouldSkipBaseline(database *gorm.DB) bool {
	var migrationCount int64
	database.Model(&migrationRecord{}).Count(&migrationCount)

	var userTableExists int64
	database.Raw(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'`).Scan(&userTableExists)

	return userTableExists > 0 || migrationCount > 0
}

func executeMigrationStatements(tx *gorm.DB, id, contents, checksum string) error {
	statements := splitSQLStatements(contents)
	if len(statements) == 0 {
		log.Printf("Warning: migration %s contains no executable statements", id)
	}

	for i, stmt := range statements {
		trimmed := strings.TrimSpace(stmt)
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}

		if err := tx.Exec(stmt).Error; err != nil {
			return fmt.Errorf("apply migration %s statement %d: %w\nStatement: %.200s", id, i+1, err, stmt)
		}
	}

	return tx.Create(&migrationRecord{ID: id, Checksum: checksum, AppliedAt: time.Now().UTC()}).Error
}

