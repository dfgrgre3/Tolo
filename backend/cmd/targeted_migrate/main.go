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
	db := initDB()
	ensureMigrationsTable(db)
	names := readMigrationFiles()
	knownApplied := knownAppliedMigrations()
	results := processAllMigrations(db, names, knownApplied)

	log.Printf("\nDone. Applied: %d, Registered: %d, Skipped: %d", results.applied, results.registered, results.skipped)
}

type migrationResults struct {
	applied    int
	registered int
	skipped    int
}

func initDB() *gorm.DB {
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
	return db
}

func ensureMigrationsTable(db *gorm.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS "schema_migrations" (id text PRIMARY KEY, checksum text NOT NULL, "appliedAt" timestamptz NOT NULL DEFAULT now())`)
}

func readMigrationFiles() []string {
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
	return names
}

func processAllMigrations(db *gorm.DB, names []string, knownApplied map[string]bool) migrationResults {
	results := migrationResults{}

	for _, name := range names {
		id := strings.TrimSuffix(name, ".sql")
		checksum := computeChecksum(name)

		result := processMigration(db, name, id, checksum, knownApplied)
		switch result {
		case migrationSkipped:
			results.skipped++
		case migrationRegistered:
			results.registered++
		case migrationApplied:
			results.applied++
		}
	}
	return results
}

func computeChecksum(name string) string {
	contents, err := os.ReadFile("internal/db/migrations/" + name)
	if err != nil {
		log.Fatalf("Read %s: %v", name, err)
	}

	sum := sha256.Sum256(contents)
	return hex.EncodeToString(sum[:])
}

type migrationResult int

const (
	migrationSkipped   migrationResult = iota
	migrationRegistered
	migrationApplied
)

func knownAppliedMigrations() map[string]bool {
	return map[string]bool{
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
}

func processMigration(db *gorm.DB, name, id, checksum string, knownApplied map[string]bool) migrationResult {
	if isAlreadyTracked(db, id) {
		return migrationSkipped
	}

	if knownApplied[id] {
		registerMigration(db, id, checksum)
		return migrationRegistered
	}

	applyMigration(db, name, id, checksum)
	return migrationApplied
}

func isAlreadyTracked(db *gorm.DB, id string) bool {
	var existing migrationRecord
	dbErr := db.First(&existing, "id = ?", id).Error
	if dbErr == nil {
		log.Printf("  ↷ Already tracked: %s", id)
		return true
	}
	if dbErr != gorm.ErrRecordNotFound {
		log.Fatalf("Check %s: %v", id, dbErr)
	}
	return false
}

func registerMigration(db *gorm.DB, id, checksum string) {
	if err := db.Create(&migrationRecord{ID: id, Checksum: checksum, AppliedAt: time.Now().UTC()}).Error; err != nil {
		log.Fatalf("Register %s: %v", id, err)
	}
	log.Printf("  ✎ Registered (already applied): %s", id)
}

func applyMigration(db *gorm.DB, name, id, checksum string) {
	log.Printf("Applying migration: %s", name)
	txErr := db.Transaction(func(tx *gorm.DB) error {
		stmts := splitSQL(readMigrationContent(name))
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
	log.Printf("  ✓ Applied: %s", name)
}

func readMigrationContent(name string) string {
	contents, err := os.ReadFile("internal/db/migrations/" + name)
	if err != nil {
		log.Fatalf("Read %s: %v", name, err)
	}
	return string(contents)
}

type sqlParser struct {
	content        []rune
	pos            int
	inSingle       bool
	inDouble       bool
	inDollar       bool
	dollarTag      string
	inLineComment  bool
	inBlockComment bool
}

func newSQLParser(content string) *sqlParser {
	return &sqlParser{content: []rune(content)}
}

func (p *sqlParser) done() bool {
	return p.pos >= len(p.content)
}

func (p *sqlParser) peek() rune {
	return p.content[p.pos]
}

func (p *sqlParser) peekAt(offset int) (rune, bool) {
	idx := p.pos + offset
	if idx < len(p.content) {
		return p.content[idx], true
	}
	return 0, false
}

func (p *sqlParser) skip(n int) {
	p.pos += n
}

func (p *sqlParser) advance() rune {
	ch := p.content[p.pos]
	p.pos++
	return ch
}

func (p *sqlParser) handleLineComment() bool {
	next, ok := p.peekAt(1)
	if !ok {
		return false
	}
	if !p.inSingle && !p.inDouble && !p.inDollar && p.peek() == '-' && next == '-' {
		p.inLineComment = true
		p.skip(2)
		return true
	}
	return false
}

func (p *sqlParser) handleBlockComment() bool {
	next, ok := p.peekAt(1)
	if !ok {
		return false
	}
	if !p.inSingle && !p.inDouble && !p.inDollar && p.peek() == '/' && next == '*' {
		p.inBlockComment = true
		p.skip(2)
		return true
	}
	return false
}

func (p *sqlParser) handleDollarQuote() bool {
	if p.inSingle || p.inDouble || p.inDollar {
		return false
	}
	if p.peek() != '$' {
		return false
	}
	j := p.pos + 1
	for j < len(p.content) && (p.content[j] == '_' ||
		(p.content[j] >= 'a' && p.content[j] <= 'z') ||
		(p.content[j] >= 'A' && p.content[j] <= 'Z') ||
		(p.content[j] >= '0' && p.content[j] <= '9')) {
		j++
	}
	if j >= len(p.content) || p.content[j] != '$' {
		return false
	}
	p.dollarTag = string(p.content[p.pos : j+1])
	p.inDollar = true
	return true
}

func (p *sqlParser) handleSemicolon() (string, bool) {
	if p.inSingle || p.inDouble || p.inDollar || p.peek() != ';' {
		return "", false
	}
	return ";", true
}

func (p *sqlParser) handleSingleQuote(buf *strings.Builder) string {
	if p.inDouble || p.inDollar {
		return ""
	}
	if p.peek() != '\'' {
		return ""
	}
	if p.inSingle {
		next, ok := p.peekAt(1)
		if ok && next == '\'' {
			buf.WriteRune(p.content[p.pos])
			buf.WriteRune(p.content[p.pos+1])
			p.skip(2)
			return "escaped"
		}
	}
	return ""
}

func splitSQL(content string) []string {
	var stmts []string
	var cur strings.Builder
	p := newSQLParser(content)

	for !p.done() {
		ch := p.peek()

		if processCommentState(p, ch) {
			continue
		}

		if !p.inSingle && !p.inDouble && !p.inDollar {
			if p.handleLineComment() {
				continue
			}
			if p.handleBlockComment() {
				continue
			}
			if p.handleDollarQuote() {
				cur.WriteString(p.dollarTag)
				p.skip(len([]rune(p.dollarTag)))
				continue
			}
			if ch == ';' {
				cur.WriteRune(ch)
				if stmt := strings.TrimSpace(cur.String()); stmt != "" {
					stmts = append(stmts, stmt)
				}
				cur.Reset()
				p.skip(1)
				continue
			}
		}

		if processQuoteStates(p, &cur, ch) {
			continue
		}

		if p.inDollar && strings.HasPrefix(string(p.content[p.pos:]), p.dollarTag) {
			cur.WriteString(p.dollarTag)
			p.skip(len([]rune(p.dollarTag)))
			p.inDollar = false
			p.dollarTag = ""
			continue
		}

		cur.WriteRune(ch)
		p.skip(1)
	}

	if stmt := strings.TrimSpace(cur.String()); stmt != "" {
		stmts = append(stmts, stmt)
	}
	return stmts
}

// processCommentState handles inline and block comment advancement.
// Returns true if the caller should continue the loop.
func processCommentState(p *sqlParser, ch rune) bool {
	if p.inLineComment {
		if ch == '\n' {
			p.inLineComment = false
		}
		p.skip(1)
		return true
	}

	if p.inBlockComment {
		next, ok := p.peekAt(1)
		if ok && ch == '*' && next == '/' {
			p.inBlockComment = false
			p.skip(2)
		} else {
			p.skip(1)
		}
		return true
	}
	return false
}

// processQuoteStates handles single and double quote advancement.
// Returns true if the caller should continue the loop.
func processQuoteStates(p *sqlParser, cur *strings.Builder, ch rune) bool {
	if ch == '\'' && !p.inDouble && !p.inDollar {
		next, ok := p.peekAt(1)
		if p.inSingle && ok && next == '\'' {
			cur.WriteRune(ch)
			cur.WriteRune(ch)
			p.skip(2)
			return true
		}
		p.inSingle = !p.inSingle
		cur.WriteRune(ch)
		p.skip(1)
		return true
	}

	if ch == '"' && !p.inSingle && !p.inDollar {
		p.inDouble = !p.inDouble
		cur.WriteRune(ch)
		p.skip(1)
		return true
	}
	return false
}