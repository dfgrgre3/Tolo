package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetChallenges(c *gin.Context) {
	var challenges []models.Challenge
	if err := db.DB.Preload("Subject").Order("created_at DESC").Find(&challenges).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch challenges")
		return
	}
	api_response.Success(c, challenges)
}

func AdminCreateChallenge(c *gin.Context) {
	var item models.Challenge
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Challenge already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create challenge")
		return
	}

	api_response.Created(c, item)
}

func AdminUpdateChallenge(c *gin.Context) {
	id := c.Param("id")
	var challenge models.Challenge
	if err := db.DB.Where(queryID, id).First(&challenge).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Challenge not found")
		return
	}

	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Points      *int    `json:"points"`
		XpReward    *int    `json:"xpReward"`
		IsActive    *bool   `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.XpReward != nil {
		updates["xp_reward"] = *input.XpReward
	} else if input.Points != nil {
		updates["xp_reward"] = *input.Points
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Challenge{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update challenge")
			return
		}
	}

	api_response.Success(c, challenge)
}

func AdminDeleteChallenge(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Challenge{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete challenge")
		return
	}
	api_response.Success(c, nil)
}
