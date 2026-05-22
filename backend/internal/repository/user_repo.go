package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"golang.org/x/sync/singleflight"
	"gorm.io/gorm"
)

type InMemoryUserCache struct {
	User      *models.User
	ExpiresAt time.Time
}

var localUserCache sync.Map

type UserRepository struct {
	db *gorm.DB
	sf singleflight.Group
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

const (
	UserCachePrefix         = "user:"
	UserCacheTTL            = 15 * time.Minute
	localUserCacheTTL       = 5 * time.Minute
	userEmailCacheKeyFormat = "%semail:%s"
	userIDCacheKeyFormat    = "%sid:%s"
	queryByEmail            = "email ILIKE ?"
)

func (r *UserRepository) Create(user *models.User) error {
	err := r.db.Create(user).Error
	if err == nil {
		r.cacheUser(user)
	}
	return err
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	cacheKey := fmt.Sprintf(userEmailCacheKeyFormat, UserCachePrefix, email)

	// Use singleflight to prevent multiple concurrent requests for the same user
	// from hitting the database/cache simultaneously
	val, err, _ := r.sf.Do(cacheKey, func() (interface{}, error) {
		var user models.User

		// Try cache first
		if db.Redis != nil {
			redisCtx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
			cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Result()
			cancel()
			if err == nil {
				if json.Unmarshal([]byte(cachedVal), &user) == nil {
					return &user, nil
				}
			}
		}

		// Hit Database (Unscoped to bypass soft delete until deleted_at column is added)
		err := r.db.Unscoped().Where(queryByEmail, email).Take(&user).Error
		if err == nil && db.Redis != nil {
			r.cacheUser(&user)
		}
		return &user, err
	})

	if err != nil {
		return nil, err
	}
	return val.(*models.User), nil
}

func (r *UserRepository) FindByEmailNoCache(email string) (*models.User, error) {
	var user models.User
	// Note: Using Unscoped() to bypass soft delete until deleted_at column is added
	err := r.db.Unscoped().Where(queryByEmail, email).Take(&user).Error
	return &user, err
}

func (r *UserRepository) FindByID(id string) (*models.User, error) {
	// 1. Try local memory cache first to bypass Redis cloud network latency
	if val, ok := localUserCache.Load(id); ok {
		cached := val.(InMemoryUserCache)
		if time.Now().Before(cached.ExpiresAt) {
			return cached.User, nil
		}
		localUserCache.Delete(id)
	}

	cacheKey := fmt.Sprintf(userIDCacheKeyFormat, UserCachePrefix, id)

	val, err, _ := r.sf.Do(cacheKey, func() (interface{}, error) {
		var user models.User

		// Try cache first
		if db.Redis != nil {
			redisCtx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
			cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Result()
			cancel()
			if err == nil {
				if json.Unmarshal([]byte(cachedVal), &user) == nil {
					return &user, nil
				}
			}
		}

		// Hit Database (Unscoped to bypass soft delete until deleted_at column is added)
		err := r.db.Unscoped().Take(&user, queryByID, id).Error
		if err == nil && db.Redis != nil {
			r.cacheUser(&user)
		}
		return &user, err
	})

	if err != nil {
		return nil, err
	}

	resUser := val.(*models.User)
	// Update local memory cache on query success
	localUserCache.Store(id, InMemoryUserCache{
		User:      resUser,
		ExpiresAt: time.Now().Add(localUserCacheTTL),
	})

	return resUser, nil
}

func (r *UserRepository) Update(user *models.User) error {
	var oldEmail string
	if user.ID != "" {
		var existing models.User
		if err := r.db.Select("email").Take(&existing, queryByID, user.ID).Error; err == nil {
			oldEmail = existing.Email
		}
	}

	err := r.db.Save(user).Error
	if err == nil {
		if oldEmail != "" && oldEmail != user.Email && db.Redis != nil {
			db.Redis.Del(context.Background(), fmt.Sprintf(userEmailCacheKeyFormat, UserCachePrefix, oldEmail))
		}
		r.cacheUser(user)
	}
	return err
}

// InvalidateCache manually evicts a user from the in-memory cache
func (r *UserRepository) InvalidateCache(id string) {
	localUserCache.Delete(id)
}

func (r *UserRepository) cacheUser(user *models.User) {
	// Populate local memory cache
	localUserCache.Store(user.ID, InMemoryUserCache{
		User:      user,
		ExpiresAt: time.Now().Add(localUserCacheTTL),
	})

	if db.Redis == nil {
		return
	}
	data, _ := json.Marshal(user)
	go func(id string, email string, data []byte) {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		db.Redis.Set(ctx, fmt.Sprintf(userIDCacheKeyFormat, UserCachePrefix, id), data, UserCacheTTL)
		db.Redis.Set(ctx, fmt.Sprintf(userEmailCacheKeyFormat, UserCachePrefix, email), data, UserCacheTTL)
	}(user.ID, user.Email, data)
}
