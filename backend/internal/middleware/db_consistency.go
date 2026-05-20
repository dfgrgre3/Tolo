package middleware

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/plugin/dbresolver"
)

// DBConsistencyMiddleware ensures that if a user performs a write operation (POST, PUT, DELETE, PATCH),
// subsequent reads for a short period (e.g., 5 seconds) are forced to the Source database
// to avoid replication lag issues (Read-After-Write inconsistency).
func DBConsistencyMiddleware(db *gorm.DB) gin.HandlerFunc {
	// Track last write time per user/session
	writeTracker := &sync.Map{}
	consistencyWindow := 5 * time.Second

	return func(c *gin.Context) {
		method := c.Request.Method
		userID := c.GetString("userId")
		if userID == "" {
			userID = c.GetString("user_id")
		}
		if userID == "" {
			userID = c.ClientIP()
		}

		// If it's a write operation, record the timestamp
		if method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH" {
			writeTracker.Store(userID, time.Now())
			c.Next()
			return
		}

		// For GET/HEAD requests, check if we should force Source
		if lastWrite, ok := writeTracker.Load(userID); ok {
			if time.Since(lastWrite.(time.Time)) < consistencyWindow {
				// Force read from Source to ensure consistency
				c.Set("db", db.Session(&gorm.Session{}).Clauses(dbresolver.Write))
			}
		}

		// Also check for explicit consistency header
		if c.GetHeader("X-Consistency-Level") == "strong" {
			c.Set("db", db.Session(&gorm.Session{}).Clauses(dbresolver.Write))
		}

		c.Next()
	}
}
