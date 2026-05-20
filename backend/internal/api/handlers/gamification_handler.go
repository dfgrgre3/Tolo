package handlers

import (
	"net/http"
	"strconv"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/cqrs/queries"

	"github.com/gin-gonic/gin"
)

var (
	gamificationQuery = queries.NewGamificationQueryService()
)

// GetLeaderboard returns the top users by XP
func GetLeaderboard(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	entries, err := gamificationQuery.GetLeaderboard(limit)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch leaderboard")
		return
	}

	leaderboard := make([]gin.H, 0, len(entries))
	for _, e := range entries {
		leaderboard = append(leaderboard, gin.H{
			"rank":    e.Rank,
			"id":      e.ID,
			"name":    e.Name,
			"avatar":  e.Avatar,
			"totalXP": e.TotalXP,
			"level":   e.Level,
			"role":    e.Role,
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
		ctxID, exists := c.Get("userId")
		if !exists {
			api_response.Error(c, http.StatusBadRequest, "User ID is required")
			return
		}
		userID = ctxID.(string)
	}

	achievements, err := gamificationQuery.GetUserAchievements(userID)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch achievements")
		return
	}

	result := make([]gin.H, 0, len(achievements))
	for _, a := range achievements {
		result = append(result, gin.H{
			"id":          a.ID,
			"title":       a.Title,
			"description": a.Description,
			"icon":        a.Icon,
			"unlockedAt":  a.UnlockedAt,
			"rarity":      a.Rarity,
			"xpReward":    a.XpReward,
		})
	}

	api_response.Success(c, gin.H{
		"achievements": result,
	})
}
