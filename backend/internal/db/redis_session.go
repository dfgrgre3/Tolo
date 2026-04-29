package db

import (
	"context"
	"encoding/json"
	"fmt"
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

// StoreSession stores a session in Redis
func (s *RedisSessionStore) StoreSession(session *models.UserSession) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("redis session store not initialized")
	}

	key := SessionKeyPrefix + session.ID

	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	// Calculate TTL based on session expiry
	ttl := time.Until(session.ExpiresAt)
	if ttl <= 0 {
		ttl = SessionTTL
	}

	return s.client.Set(s.ctx, key, data, ttl).Err()
}

// GetSession retrieves a session from Redis
func (s *RedisSessionStore) GetSession(jti string) (*models.UserSession, error) {
	if s == nil || s.client == nil {
		return nil, fmt.Errorf("redis session store not initialized")
	}

	key := SessionKeyPrefix + jti

	data, err := s.client.Get(s.ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("session not found")
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	var session models.UserSession
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session: %w", err)
	}

	return &session, nil
}

// RevokeSession revokes a session in Redis
func (s *RedisSessionStore) RevokeSession(jti string) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("redis session store not initialized")
	}

	key := SessionKeyPrefix + jti
	return s.client.Del(s.ctx, key).Err()
}

// RevokeAllUserSessions revokes all sessions for a user
func (s *RedisSessionStore) RevokeAllUserSessions(userID string) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("redis session store not initialized")
	}

	// Use SCAN instead of KEYS to avoid blocking Redis at scale
	pattern := SessionKeyPrefix + "*"
	var cursor uint64
	for {
		keys, nextCursor, err := s.client.Scan(s.ctx, cursor, pattern, 100).Result()
		if err != nil {
			return fmt.Errorf("failed to scan session keys: %w", err)
		}

		// Filter keys by userID (we need to check the session data)
		for _, key := range keys {
			data, err := s.client.Get(s.ctx, key).Bytes()
			if err != nil {
				continue
			}

			var session models.UserSession
			if err := json.Unmarshal(data, &session); err != nil {
				continue
			}

			if session.UserID == userID {
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
	if s == nil || s.client == nil {
		return fmt.Errorf("redis session store not initialized")
	}

	key := SessionKeyPrefix + jti

	data, err := s.client.Get(s.ctx, key).Bytes()
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}

	var session models.UserSession
	if err := json.Unmarshal(data, &session); err != nil {
		return fmt.Errorf("failed to unmarshal session: %w", err)
	}

	session.LastAccessed = time.Now()

	newData, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	// Reset TTL
	ttl := time.Until(session.ExpiresAt)
	if ttl <= 0 {
		ttl = SessionTTL
	}

	return s.client.Set(s.ctx, key, newData, ttl).Err()
}

// IsSessionActive checks if a session is active (exists and not expired)
func (s *RedisSessionStore) IsSessionActive(jti string) (bool, error) {
	if s == nil || s.client == nil {
		return false, fmt.Errorf("redis session store not initialized")
	}

	key := SessionKeyPrefix + jti

	exists, err := s.client.Exists(s.ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check session: %w", err)
	}

	return exists > 0, nil
}