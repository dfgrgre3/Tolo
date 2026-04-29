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

type SubjectRepository struct {
	db *gorm.DB
	sf singleflight.Group
}

func NewSubjectRepository(db *gorm.DB) *SubjectRepository {
	return &SubjectRepository{db: db}
}

const (
	SubjectCachePrefix = "subject:"
	SubjectCacheTTL    = 30 * time.Minute // Subjects change less frequently than users
)

// allowedSubjectFilters is a whitelist of safe column names for dynamic filtering.
// This prevents SQL injection through user-controlled filter keys.
var allowedSubjectFilters = map[string]string{
	"isActive":    `"isActive"`,
	"isPublished": `"isPublished"`,
	"level":       "level",
	"categoryId":  `"categoryId"`,
	"language":    "language",
	"isFeatured":  `"isFeatured"`,
}

func (r *SubjectRepository) FindByID(id string) (*models.Subject, error) {
	cacheKey := fmt.Sprintf("%sid:%s", SubjectCachePrefix, id)

	val, err, _ := r.sf.Do(cacheKey, func() (interface{}, error) {
		var subject models.Subject
		
		// Try cache first
		if db.Redis != nil {
			cachedVal, err := db.Redis.Get(context.Background(), cacheKey).Result()
			if err == nil {
				if json.Unmarshal([]byte(cachedVal), &subject) == nil {
					return &subject, nil
				}
			}
		}

		// Hit Database
		err := r.db.Preload("Topics.SubTopics").First(&subject, "id = ?", id).Error
		if err == nil && db.Redis != nil {
			r.cacheSubject(&subject)
		}
		return &subject, err
	})

	if err != nil {
		return nil, err
	}
	return val.(*models.Subject), nil
}

func (r *SubjectRepository) FindAll(filters map[string]interface{}) ([]models.Subject, error) {
	// For lists, we might not want to cache the entire result set in a single key 
	// because filters vary wildly. But we can cache individual subjects.
	var subjects []models.Subject
	query := r.db.Model(&models.Subject{}).Preload("Topics")
	
	for k, v := range filters {
		// Only allow whitelisted filter keys to prevent SQL injection
		safeColumn, ok := allowedSubjectFilters[k]
		if !ok {
			continue // Skip unknown/unsafe filter keys
		}
		query = query.Where(fmt.Sprintf("%s = ?", safeColumn), v)
	}

	err := query.Find(&subjects).Error
	return subjects, err
}

func (r *SubjectRepository) Create(subject *models.Subject) error {
	err := r.db.Create(subject).Error
	if err == nil {
		r.cacheSubject(subject)
	}
	return err
}

func (r *SubjectRepository) Update(subject *models.Subject) error {
	err := r.db.Save(subject).Error
	if err == nil {
		r.cacheSubject(subject)
	}
	return err
}

func (r *SubjectRepository) Delete(id string) error {
	err := r.db.Delete(&models.Subject{}, "id = ?", id).Error
	if err == nil && db.Redis != nil {
		ctx := context.Background()
		db.Redis.Del(ctx, fmt.Sprintf("%sid:%s", SubjectCachePrefix, id))
	}
	return err
}

func (r *SubjectRepository) cacheSubject(subject *models.Subject) {
	if db.Redis == nil {
		return
	}
	data, _ := json.Marshal(subject)
	ctx := context.Background()
	db.Redis.Set(ctx, fmt.Sprintf("%sid:%s", SubjectCachePrefix, subject.ID), data, SubjectCacheTTL)
}
