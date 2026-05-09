package handlers

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
