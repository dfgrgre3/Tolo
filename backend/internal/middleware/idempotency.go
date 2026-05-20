package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"thanawy-backend/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	idempotencyTTL    = 24 * time.Hour
	idempotencyPrefix = "idempotency:"
)

type idempotencyResponse struct {
	Status int
	Body   json.RawMessage
}

func Idempotency() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "GET" || c.Request.Method == "OPTIONS" || c.Request.Method == "HEAD" {
			c.Next()
			return
		}

		if db.Redis == nil {
			c.Next()
			return
		}

		key := c.GetHeader("Idempotency-Key")
		if key == "" {
			key = uuid.New().String()
		}

		bodyBytes, exists := c.Get(gin.BodyBytesKey)
		var bodyData []byte
		if exists {
			if b, ok := bodyBytes.([]byte); ok {
				bodyData = b
			}
		}
		bodyHash := sha256.Sum256(bodyData)
		dedupKey := idempotencyPrefix + c.Request.Method + ":" + c.FullPath() + ":" + key

		// Check if we've already processed this exact request
		existing, err := db.Redis.Get(c.Request.Context(), dedupKey).Result()
		if err == nil && existing != "" {
			var cached idempotencyResponse
			if json.Unmarshal([]byte(existing), &cached) == nil {
				c.AbortWithStatusJSON(cached.Status, cached.Body)
				return
			}
		}

		// Lock with NX to prevent concurrent duplicates
		locked, err := db.Redis.SetNX(c.Request.Context(), dedupKey+":lock", string(bodyHash[:]), idempotencyTTL).Result()
		if err != nil {
			log.Printf("[Idempotency] Redis error: %v", err)
			c.Next()
			return
		}
		if !locked {
			c.AbortWithStatusJSON(http.StatusConflict, gin.H{
				"error": "Request is already being processed. Use the same Idempotency-Key to retry.",
			})
			return
		}

		// Capture response
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		c.Next()

		// Cache response for future idempotent replay
		if c.Writer.Status() < 500 {
			resp := idempotencyResponse{
				Status: c.Writer.Status(),
				Body:   blw.body.Bytes(),
			}
			data, _ := json.Marshal(resp)
			db.Redis.Set(c.Request.Context(), dedupKey, string(data), idempotencyTTL)
		}

		// Release lock after caching
		db.Redis.Del(c.Request.Context(), dedupKey+":lock")
	}
}

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *bodyLogWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}
