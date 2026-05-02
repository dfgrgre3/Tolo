package db

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"thanawy-backend/internal/models"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// SessionKeyPrefix is the prefix for session keys in Redis
	SessionKeyPrefix = "session:"
	// SessionTTL is the default TTL for sessions (24 hours)
	SessionTTL = 24 * time.Hour
)

// RedisSessionStore provides Redis-based session management
type RedisSessionStore struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisSessionStore creates a new Redis session store
func NewRedisSessionStore() *RedisSessionStore {
	if Redis == nil {
		return nil
	}
	return &RedisSessionStore{
		client: Redis,
		ctx:    context.Background(),
	}
}

// StoreSession stores a session in Redis with DB fallback
func (s *RedisSessionStore) StoreSession(session *models.UserSession) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("redis session store not initialized")
	}

	key := SessionKeyPrefix + session.ID

	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	// Persist to DB first as the source of truth
	if DB != nil {
		if err := DB.Save(session).Error; err != nil {
			log.Printf("Failed to persist session to DB: %v", err)
			// Continue to Redis anyway
		}
	}

	// Calculate TTL based on session expiry
	ttl := time.Until(session.ExpiresAt)
	if ttl <= 0 {
		ttl = SessionTTL
	}

	return s.client.Set(s.ctx, key, data, ttl).Err()
}

// GetSession retrieves a session from Redis with DB fallback
func (s *RedisSessionStore) GetSession(jti string) (*models.UserSession, error) {
	if s == nil || s.client == nil {
		return nil, fmt.Errorf("redis session store not initialized")
	}

	key := SessionKeyPrefix + jti

	// 1. Try Redis first (fast path)
	data, err := s.client.Get(s.ctx, key).Bytes()
	if err == nil {
		var session models.UserSession
		if err := json.Unmarshal(data, &session); err == nil {
			return &session, nil
		}
	}

	// 2. Fallback to DB if not found in Redis or unmarshal failed
	if DB != nil {
		var session models.UserSession
		if err := DB.First(&session, "id = ?", jti).Error; err == nil {
			// Check if expired
			if time.Now().After(session.ExpiresAt) {
				return nil, fmt.Errorf("session expired")
			}

			// Restore to Redis for future requests
			ttl := time.Until(session.ExpiresAt)
			data, _ := json.Marshal(session)
			s.client.Set(s.ctx, key, data, ttl)

			return &session, nil
		}
	}

	return nil, fmt.Errorf("session not found")
}

// RevokeSession revokes a session in Redis and DB
func (s *RedisSessionStore) RevokeSession(jti string) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("redis session store not initialized")
	}

	// Delete from DB
	if DB != nil {
		DB.Delete(&models.UserSession{}, "id = ?", jti)
	}

	key := SessionKeyPrefix + jti
	return s.client.Del(s.ctx, key).Err()
}

// RevokeAllUserSessions revokes all sessions for a user
func (s *RedisSessionStore) RevokeAllUserSessions(userID string) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("redis session store not initialized")
	}

	// Delete from DB
	if DB != nil {
		DB.Delete(&models.UserSession{}, "\"userId\" = ?", userID)
	}

	// Clear from Redis (using scan for safety)
	pattern := SessionKeyPrefix + "*"
	var cursor uint64
	for {
		keys, nextCursor, err := s.client.Scan(s.ctx, cursor, pattern, 100).Result()
		if err != nil {
			break
		}

		for _, key := range keys {
			data, err := s.client.Get(s.ctx, key).Bytes()
			if err != nil {
				continue
			}

			var session models.UserSession
			if err := json.Unmarshal(data, &session); err == nil && session.UserID == userID {
				s.client.Del(s.ctx, key)
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return nil
}

// UpdateLastAccessed updates the last accessed time for a session
func (s *RedisSessionStore) UpdateLastAccessed(jti string) error {
	session, err := s.GetSession(jti)
	if err != nil {
		return err
	}

	session.LastAccessed = time.Now()

	// Update in DB
	if DB != nil {
		DB.Model(&models.UserSession{}).Where("id = ?", jti).Update("lastAccessed", session.LastAccessed)
	}

	// Update in Redis
	data, _ := json.Marshal(session)
	ttl := time.Until(session.ExpiresAt)
	if ttl <= 0 {
		ttl = SessionTTL
	}
	return s.client.Set(s.ctx, SessionKeyPrefix+jti, data, ttl).Err()
}

// IsSessionActive checks if a session is active (exists and not expired)
func (s *RedisSessionStore) IsSessionActive(jti string) (bool, error) {
	session, err := s.GetSession(jti)
	if err != nil {
		return false, nil // Treat not found as inactive
	}

	return time.Now().Before(session.ExpiresAt), nil
}
