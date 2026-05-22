package handlers

import (
	"net/http"
	"strconv"
	"strings"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/cqrs/queries"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
			"rank":     e.Rank,
			"id":       e.ID,
			"userId":   e.ID,
			"name":     e.Name,
			"username": e.Name,
			"avatar":   e.Avatar,
			"totalXP":  e.TotalXP,
			"level":    e.Level,
			"role":     e.Role,
		})
	}

	api_response.Success(c, gin.H{
		"leaderboard": leaderboard,
	})
}

// GetUserProgress returns the current gamification progress for a specific user.
func GetUserProgress(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		ctxID, exists := c.Get("userId")
		if !exists {
			api_response.Error(c, http.StatusBadRequest, "User ID is required")
			return
		}
		userID = ctxID.(string)
	}

	progress, err := gamificationQuery.GetUserProgress(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			api_response.Success(c, queries.NewDefaultUserProgress(userID))
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch user progress")
		return
	}

	api_response.Success(c, progress)
}

func CreateCustomGoal(c *gin.Context) {
	userID := c.GetString("userId")
	var input struct {
		UserID       string  `json:"userId"`
		Title        string  `json:"title"`
		Description  string  `json:"description"`
		TargetValue  float64 `json:"targetValue"`
		CurrentValue float64 `json:"currentValue"`
		Unit         string  `json:"unit"`
		Category     string  `json:"category"`
		XPReward     int     `json:"xpReward"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.UserID != "" && input.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot create goals for another user"})
		return
	}

	input.Title = strings.TrimSpace(input.Title)
	input.Unit = strings.TrimSpace(input.Unit)
	input.Category = strings.TrimSpace(input.Category)
	if input.Title == "" || input.TargetValue <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title and a positive targetValue are required"})
		return
	}
	if input.Unit == "" {
		input.Unit = "units"
	}
	if input.Category == "" {
		input.Category = "general"
	}
	if input.XPReward <= 0 {
		input.XPReward = 10
	}

	now := time.Now()
	goal := models.CustomGoal{
		UserID:       userID,
		Title:        input.Title,
		Description:  strings.TrimSpace(input.Description),
		TargetValue:  input.TargetValue,
		CurrentValue: input.CurrentValue,
		Unit:         input.Unit,
		Category:     input.Category,
		XPReward:     input.XPReward,
	}
	if goal.CurrentValue >= goal.TargetValue {
		goal.IsCompleted = true
		goal.CompletedAt = &now
	}

	if err := db.DB.Create(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create custom goal"})
		return
	}
	c.JSON(http.StatusCreated, goal)
}

func UpdateCustomGoal(c *gin.Context) {
	userID := c.GetString("userId")
	var input struct {
		CurrentValue float64 `json:"currentValue"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var goal models.CustomGoal
	if err := db.DB.First(&goal, "id = ? AND \"userId\" = ?", c.Param("id"), userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Custom goal not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch custom goal"})
		return
	}

	goal.CurrentValue = input.CurrentValue
	if goal.CurrentValue >= goal.TargetValue {
		if !goal.IsCompleted {
			now := time.Now()
			goal.CompletedAt = &now
		}
		goal.IsCompleted = true
	} else {
		goal.IsCompleted = false
		goal.CompletedAt = nil
	}

	if err := db.DB.Save(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update custom goal"})
		return
	}
	c.JSON(http.StatusOK, goal)
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
			"key":         a.Key,
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
