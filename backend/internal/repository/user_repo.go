package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"golang.org/x/sync/singleflight"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
	sf singleflight.Group
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

const (
	UserCachePrefix = "user:"
	UserCacheTTL    = 15 * time.Minute
)

func (r *UserRepository) Create(user *models.User) error {
	err := r.db.Create(user).Error
	if err == nil {
		r.cacheUser(user)
	}
	return err
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	cacheKey := fmt.Sprintf("%semail:%s", UserCachePrefix, email)

	// Use singleflight to prevent multiple concurrent requests for the same user
	// from hitting the database/cache simultaneously
	val, err, _ := r.sf.Do(cacheKey, func() (interface{}, error) {
		var user models.User

		// Try cache first
		if db.Redis != nil {
			cachedVal, err := db.Redis.Get(context.Background(), cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cachedVal), &user) == nil {
					return &user, nil
				}
			}
		}

		// Hit Database
		err := r.db.Where("email = ?", email).First(&user).Error
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
	err := r.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *UserRepository) FindByID(id string) (*models.User, error) {
	cacheKey := fmt.Sprintf("%sid:%s", UserCachePrefix, id)

	val, err, _ := r.sf.Do(cacheKey, func() (interface{}, error) {
		var user models.User

		// Try cache first
		if db.Redis != nil {
			cachedVal, err := db.Redis.Get(context.Background(), cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cachedVal), &user) == nil {
					return &user, nil
				}
			}
		}

		// Hit Database
		err := r.db.First(&user, "id = ?", id).Error
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

func (r *UserRepository) Update(user *models.User) error {
	var oldEmail string
	if user.ID != "" {
		var existing models.User
		if err := r.db.Select("email").First(&existing, "id = ?", user.ID).Error; err == nil {
			oldEmail = existing.Email
		}
	}

	err := r.db.Save(user).Error
	if err == nil {
		if oldEmail != "" && oldEmail != user.Email && db.Redis != nil {
			db.Redis.Del(context.Background(), fmt.Sprintf("%semail:%s", UserCachePrefix, oldEmail))
		}
		r.cacheUser(user)
	}
	return err
}

func (r *UserRepository) cacheUser(user *models.User) {
	if db.Redis == nil {
		return
	}
	data, _ := json.Marshal(user)
	ctx := context.Background()
	db.Redis.Set(ctx, fmt.Sprintf("%sid:%s", UserCachePrefix, user.ID), data, UserCacheTTL)
	db.Redis.Set(ctx, fmt.Sprintf("%semail:%s", UserCachePrefix, user.Email), data, UserCacheTTL)
}
