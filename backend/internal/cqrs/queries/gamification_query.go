package queries

import (
	"time"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

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
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	UnlockedAt  time.Time `json:"unlockedAt"`
	Rarity      string    `json:"rarity"`
	XpReward    int       `json:"xpReward"`
}

type GamificationQueryService struct {
	readDB *gorm.DB
}

func NewGamificationQueryService() *GamificationQueryService {
	return &GamificationQueryService{readDB: db.ReadDB()}
}

func (s *GamificationQueryService) GetLeaderboard(limit int) ([]LeaderboardEntryReadModel, error) {
	var users []models.User
	if err := s.readDB.Order("total_xp DESC").Limit(limit).Find(&users).Error; err != nil {
		return nil, err
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
	return leaderboard, nil
}

func (s *GamificationQueryService) GetUserAchievements(userID string) ([]UserAchievementReadModel, error) {
	var userAchievements []models.UserAchievement
	if err := s.readDB.Preload("Achievement").Where("user_id = ?", userID).Find(&userAchievements).Error; err != nil {
		return nil, err
	}

	achievements := make([]UserAchievementReadModel, 0, len(userAchievements))
	for _, ua := range userAchievements {
		if ua.Achievement != nil {
			achievements = append(achievements, UserAchievementReadModel{
				ID:          ua.Achievement.ID,
				Title:       ua.Achievement.Title,
				Description: ua.Achievement.Description,
				Icon:        ua.Achievement.Icon,
				UnlockedAt:  ua.UnlockedAt,
				Rarity:      ua.Achievement.Rarity,
				XpReward:    ua.Achievement.XpReward,
			})
		}
	}
	return achievements, nil
}
