package cache

import (
	"context"
	"fmt"
	"log"
	"time"

	"thanawy-backend/internal/db"
)

const (
	CachePrefixSubject  = "subject:"
	CachePrefixUser     = "user:"
	CachePrefixCategory = "category:"
	CachePrefixExam     = "exam:"
	CachePrefixList     = "list:"
	CacheTTLSubject     = 30 * time.Minute
	CacheTTLUser        = 15 * time.Minute
	CacheTTLCategory    = 1 * time.Hour
	CacheTTLExam        = 30 * time.Minute
	CacheTTLList        = 5 * time.Minute
)

// Cache key format patterns
const (
	entityIDKeyFmt = "%sid:%s"
)

type CacheInvalidator struct {
	ctx context.Context
}

func NewCacheInvalidator() *CacheInvalidator {
	return &CacheInvalidator{ctx: context.Background()}
}

func (ci *CacheInvalidator) InvalidateSubject(id string) {
	if db.Redis == nil {
		return
	}
	key := fmt.Sprintf(entityIDKeyFmt, CachePrefixSubject, id)
	ci.del(key)
	ci.invalidatePattern(CachePrefixSubject + CachePrefixList + "*")
	log.Printf("[Cache] Invalidated subject cache: %s", id)
}

func (ci *CacheInvalidator) InvalidateUser(id string) {
	if db.Redis == nil {
		return
	}
	ci.del(fmt.Sprintf(entityIDKeyFmt, CachePrefixUser, id))
	ci.del(fmt.Sprintf("%semail:*", CachePrefixUser))
	log.Printf("[Cache] Invalidated user cache: %s", id)
}

func (ci *CacheInvalidator) InvalidateCategory(id string) {
	if db.Redis == nil {
		return
	}
	key := fmt.Sprintf(entityIDKeyFmt, CachePrefixCategory, id)
	ci.del(key)
	ci.invalidatePattern(CachePrefixCategory + CachePrefixList + "*")
	log.Printf("[Cache] Invalidated category cache: %s", id)
}

func (ci *CacheInvalidator) InvalidateExam(id string) {
	if db.Redis == nil {
		return
	}
	key := fmt.Sprintf(entityIDKeyFmt, CachePrefixExam, id)
	ci.del(key)
	ci.invalidatePattern(CachePrefixExam + CachePrefixList + "*")
	log.Printf("[Cache] Invalidated exam cache: %s", id)
}

func (ci *CacheInvalidator) InvalidateAllLists() {
	if db.Redis == nil {
		return
	}
	ci.invalidatePattern("*" + CachePrefixList + "*")
	log.Printf("[Cache] Invalidated all list caches")
}

func (ci *CacheInvalidator) InvalidateMaterializedViews() {
	if db.Redis == nil {
		return
	}
	ci.del("mv_user_progress_summary")
	ci.del("mv_user_weekly_analytics")
	ci.del("mv_user_watch_time")
	log.Printf("[Cache] Invalidated materialized view caches")
}

func (ci *CacheInvalidator) del(key string) {
	if err := db.Redis.Del(ci.ctx, key).Err(); err != nil {
		log.Printf("[Cache] Error deleting key %s: %v", key, err)
	}
}

func (ci *CacheInvalidator) invalidatePattern(pattern string) {
	iter := db.Redis.Scan(ci.ctx, 0, pattern, 100).Iterator()
	for iter.Next(ci.ctx) {
		if err := db.Redis.Del(ci.ctx, iter.Val()).Err(); err != nil {
			log.Printf("[Cache] Error deleting pattern match %s: %v", iter.Val(), err)
		}
	}
}