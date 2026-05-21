package handlers

import (
	"errors"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// common.go contains shared constants and helper functions used across
// multiple handler files in the handlers package.

// Shared query constants
const (
	idQuery             = "id = ?"
	queryID             = "id = ?" // alias used in admin handlers
	statusQuery         = "status = ?"
	idInQuery           = "id IN ?"
	createdAtDescSort   = "\"created_at\" desc"
	queryRole           = "role = ?"
	createdAtRangeQuery = "\"created_at\" >= ? AND \"created_at\" < ?"
	createdAtGte        = "\"created_at\" >= ?"
	isActiveQuery       = "is_active = ?"
	dateFormat          = "2006-01-02"
)

// Shared error message constants
const (
	errUserNotFound = "User not found"
	authRequired    = "Authentication required"
)

// stringOrEmpty safely dereferences a *string pointer, returning "" if nil.
func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// firstNonEmpty returns the first non-empty string from the given values.
func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// IsDuplicateKeyError checks if the error is a PostgreSQL unique constraint violation.
func IsDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "23505") ||
		strings.Contains(msg, "record already exists")
}

// SafeCreate attempts to create a record and returns a friendly error if it's a duplicate.
func SafeCreate(db *gorm.DB, value interface{}) error {
	err := db.Create(value).Error
	if IsDuplicateKeyError(err) {
		return errors.New("record already exists")
	}
	return err
}

// UpsertBy performs a FirstOrCreate upsert using the given query conditions.
// Returns true if the record was created, false if it already existed.
func UpsertBy(db *gorm.DB, query interface{}, args []interface{}, value interface{}) (bool, error) {
	result := db.Where(query, args...).First(value)
	if result.Error == nil {
		return false, nil
	}
	if result.Error != gorm.ErrRecordNotFound {
		return false, result.Error
	}
	err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(value).Error
	if IsDuplicateKeyError(err) {
		db.Where(query, args...).First(value)
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// CreateOrAssign performs an upsert: finds existing record or creates new one with assigned values.
func CreateOrAssign(db *gorm.DB, query interface{}, args []interface{}, value interface{}, assigns map[string]interface{}) error {
	result := db.Where(query, args...).First(value)
	if result.Error == nil {
		if len(assigns) > 0 {
			return db.Model(value).Updates(assigns).Error
		}
		return nil
	}
	if result.Error != gorm.ErrRecordNotFound {
		return result.Error
	}
	conds := append([]interface{}{query}, args...)
	err := db.Assign(assigns).FirstOrCreate(value, conds...).Error
	if IsDuplicateKeyError(err) {
		return db.Where(query, args...).First(value).Error
	}
	return err
}
