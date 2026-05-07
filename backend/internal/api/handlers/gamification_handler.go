package handlers

import (
	"net/http"
	"strconv"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	api_response "thanawy-backend/internal/api/response"

	"github.com/gin-gonic/gin"
)

// GetLeaderboard returns the top users by XP
func GetLeaderboard(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	var users []models.User
	// Fetch top users by XP
	if err := db.DB.Order("total_xp DESC").Limit(limit).Find(&users).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch leaderboard")
		return
	}

	leaderboard := make([]gin.H, 0, len(users))
	for i, u := range users {
		leaderboard = append(leaderboard, gin.H{
			"rank":     i + 1,
			"id":       u.ID,
			"name":     firstNonEmpty(stringOrEmpty(u.Name), stringOrEmpty(u.Username), u.Email),
			"avatar":   u.Avatar,
			"totalXP":  u.TotalXP,
			"level":    u.Level,
			"role":     u.Role,
		})
	}

	api_response.Success(c, gin.H{
		"leaderboard": leaderboard,
	})
}

// GetUserAchievements returns achievements for a specific user
func GetUserAchievements(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		// Fallback to current user from context
		ctxID, exists := c.Get("userId")
		if !exists {
			api_response.Error(c, http.StatusBadRequest, "User ID is required")
			return
		}
		userID = ctxID.(string)
	}

	var userAchievements []models.UserAchievement
	if err := db.DB.Preload("Achievement").Where("user_id = ?", userID).Find(&userAchievements).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch achievements")
		return
	}

	achievements := make([]gin.H, 0, len(userAchievements))
	for _, ua := range userAchievements {
		if ua.Achievement != nil {
			achievements = append(achievements, gin.H{
				"id":          ua.Achievement.ID,
				"title":       ua.Achievement.Title,
				"description": ua.Achievement.Description,
				"icon":        ua.Achievement.Icon,
				"unlockedAt":  ua.UnlockedAt,
				"rarity":      ua.Achievement.Rarity,
				"xpReward":    ua.Achievement.XpReward,
			})
		}
	}

	api_response.Success(c, gin.H{
		"achievements": achievements,
	})
}
