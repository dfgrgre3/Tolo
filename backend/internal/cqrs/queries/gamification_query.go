package queries

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type LeaderboardEntryReadModel struct {
	Rank    int    `json:"rank"`
	ID      string `json:"id"`
	Name    string `json:"name"`
	Avatar  string `json:"avatar"`
	TotalXP int    `json:"totalXP"`
	Level   int    `json:"level"`
	Role    string `json:"role"`
}

type UserAchievementReadModel struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	UnlockedAt  time.Time `json:"unlockedAt"`
	Rarity      string    `json:"rarity"`
	XpReward    int       `json:"xpReward"`
}

type UserProgressReadModel struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	TotalXP        int       `json:"totalXP"`
	Level          int       `json:"level"`
	CurrentStreak  int       `json:"currentStreak"`
	LongestStreak  int       `json:"longestStreak"`
	TotalStudyTime int       `json:"totalStudyTime"`
	Achievements   []string  `json:"achievements"`
	CustomGoals    []any     `json:"customGoals"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type GamificationQueryService struct {
}

type l1LeaderboardEntry struct {
	entries   []LeaderboardEntryReadModel
	expiresAt time.Time
}

type l1AchievementsEntry struct {
	entries   []UserAchievementReadModel
	expiresAt time.Time
}

var (
	l1LeaderboardCache  sync.Map
	l1AchievementsCache sync.Map
)

const (
	leaderboardL1TTL     = time.Minute
	leaderboardRedisTTL  = 10 * time.Minute
	achievementsL1TTL    = time.Minute
	achievementsRedisTTL = 10 * time.Minute
)

func NewGamificationQueryService() *GamificationQueryService {
	return &GamificationQueryService{}
}

func NewDefaultUserProgress(userID string) *UserProgressReadModel {
	now := time.Now()
	return &UserProgressReadModel{
		ID:             userID,
		UserID:         userID,
		TotalXP:        0,
		Level:          1,
		CurrentStreak:  0,
		LongestStreak:  0,
		TotalStudyTime: 0,
		Achievements:   []string{},
		CustomGoals:    []any{},
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// readDBOrFallback dynamically retrieves the read DB connection.
func (s *GamificationQueryService) readDBOrFallback() *gorm.DB {
	return db.ReadDB()
}

func (s *GamificationQueryService) GetLeaderboard(limit int) ([]LeaderboardEntryReadModel, error) {
	// 1. Try L1 cache first
	if val, ok := l1LeaderboardCache.Load(limit); ok {
		entry := val.(*l1LeaderboardEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.entries, nil
		}
		l1LeaderboardCache.Delete(limit)
	}

	ctx := context.Background()
	cacheKey := fmt.Sprintf("leaderboard:%d", limit)

	// 2. Try Redis cache next
	if db.Redis != nil {
		redisCtx, cancel := context.WithTimeout(ctx, 200*time.Millisecond)
		cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Result()
		cancel()
		if err == nil {
			var cachedLeaderboard []LeaderboardEntryReadModel
			if json.Unmarshal([]byte(cachedVal), &cachedLeaderboard) == nil {
				// Warm L1
				l1LeaderboardCache.Store(limit, &l1LeaderboardEntry{
					entries:   cachedLeaderboard,
					expiresAt: time.Now().Add(leaderboardL1TTL),
				})
				return cachedLeaderboard, nil
			}
		}
	}

	rdb := s.readDBOrFallback()
	if rdb == nil {
		return nil, nil
	}

	var users []models.User
	err := rdb.
		Select("id", "email", "name", "username", "avatar", "total_xp", "level", "role").
		Where("status = ?", models.StatusActive).
		Order("total_xp DESC").
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	if len(users) < limit {
		// If not enough active users, include inactive ones
		var remainingUsers []models.User
		remainingCount := limit - len(users)
		rdb.
			Select("id", "email", "name", "username", "avatar", "total_xp", "level", "role").
			Where("status != ?", models.StatusActive).
			Order("total_xp DESC").
			Limit(remainingCount).
			Find(&remainingUsers)
		users = append(users, remainingUsers...)
	}

	leaderboard := make([]LeaderboardEntryReadModel, 0, len(users))
	for i, u := range users {
		name := u.Email
		if u.Name != nil && *u.Name != "" {
			name = *u.Name
		} else if u.Username != nil && *u.Username != "" {
			name = *u.Username
		}
		avatar := ""
		if u.Avatar != nil {
			avatar = *u.Avatar
		}
		leaderboard = append(leaderboard, LeaderboardEntryReadModel{
			Rank:    i + 1,
			ID:      u.ID,
			Name:    name,
			Avatar:  avatar,
			TotalXP: u.TotalXP,
			Level:   u.Level,
			Role:    string(u.Role),
		})
	}

	// 3. Cache the result in both L1 and Redis
	l1LeaderboardCache.Store(limit, &l1LeaderboardEntry{
		entries:   leaderboard,
		expiresAt: time.Now().Add(leaderboardL1TTL),
	})

	if db.Redis != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if cacheBytes, err := json.Marshal(leaderboard); err == nil {
				db.Redis.Set(ctx, cacheKey, cacheBytes, leaderboardRedisTTL)
			}
		}()
	}

	return leaderboard, nil
}

func (s *GamificationQueryService) GetUserProgress(userID string) (*UserProgressReadModel, error) {
	rdb := s.readDBOrFallback()
	if rdb == nil {
		return NewDefaultUserProgress(userID), nil
	}

	var user models.User
	loadUser := func(conn *gorm.DB) error {
		return conn.
			Select("id", "total_xp", "level", "current_streak", "longest_streak", "total_study_time", "created_at", "updated_at").
			Where("id = ?", userID).
			First(&user).Error
	}

	if err := loadUser(rdb); err != nil {
		if err == gorm.ErrRecordNotFound && rdb != db.DB && db.DB != nil {
			err = loadUser(db.DB)
		}
		if err != nil {
			return nil, err
		}
	}

	achievements, err := s.GetUserAchievements(userID)
	if err != nil {
		return nil, err
	}

	achievementKeys := make([]string, 0, len(achievements))
	for _, achievement := range achievements {
		if achievement.Key != "" {
			achievementKeys = append(achievementKeys, achievement.Key)
		} else {
			achievementKeys = append(achievementKeys, achievement.ID)
		}
	}

	return &UserProgressReadModel{
		ID:             user.ID,
		UserID:         user.ID,
		TotalXP:        user.TotalXP,
		Level:          user.Level,
		CurrentStreak:  user.CurrentStreak,
		LongestStreak:  user.LongestStreak,
		TotalStudyTime: user.TotalStudyTime,
		Achievements:   achievementKeys,
		CustomGoals:    []any{},
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      user.UpdatedAt,
	}, nil
}

func (s *GamificationQueryService) GetUserAchievements(userID string) ([]UserAchievementReadModel, error) {
	if val, ok := l1AchievementsCache.Load(userID); ok {
		entry := val.(*l1AchievementsEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.entries, nil
		}
		l1AchievementsCache.Delete(userID)
	}

	cacheKey := fmt.Sprintf("achievements:%s", userID)
	if db.Redis != nil {
		redisCtx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
		cachedVal, err := db.Redis.Get(redisCtx, cacheKey).Result()
		cancel()
		if err == nil {
			var cachedAchievements []UserAchievementReadModel
			if json.Unmarshal([]byte(cachedVal), &cachedAchievements) == nil {
				l1AchievementsCache.Store(userID, &l1AchievementsEntry{
					entries:   cachedAchievements,
					expiresAt: time.Now().Add(achievementsL1TTL),
				})
				return cachedAchievements, nil
			}
		}
	}

	rdb := s.readDBOrFallback()
	if rdb == nil {
		return nil, nil
	}

	var userAchievements []models.UserAchievement
	if err := rdb.Preload("Achievement").Where("user_id = ?", userID).Find(&userAchievements).Error; err != nil {
		return nil, err
	}

	achievements := make([]UserAchievementReadModel, 0, len(userAchievements))
	for _, ua := range userAchievements {
		if ua.Achievement != nil {
			achievements = append(achievements, UserAchievementReadModel{
				ID:          ua.Achievement.ID,
				Key:         ua.Achievement.Key,
				Title:       ua.Achievement.Title,
				Description: ua.Achievement.Description,
				Icon:        ua.Achievement.Icon,
				UnlockedAt:  ua.UnlockedAt,
				Rarity:      ua.Achievement.Rarity,
				XpReward:    ua.Achievement.XpReward,
			})
		}
	}
	l1AchievementsCache.Store(userID, &l1AchievementsEntry{
		entries:   achievements,
		expiresAt: time.Now().Add(achievementsL1TTL),
	})
	if db.Redis != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if cacheBytes, err := json.Marshal(achievements); err == nil {
				db.Redis.Set(ctx, cacheKey, cacheBytes, achievementsRedisTTL)
			}
		}()
	}
	return achievements, nil
}
