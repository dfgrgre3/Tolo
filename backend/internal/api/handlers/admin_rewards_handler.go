package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetRewards(c *gin.Context) {
	var rewards []models.Reward
	if err := db.DB.Order("created_at DESC").Find(&rewards).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch rewards")
		return
	}
	api_response.Success(c, rewards)
}

func AdminCreateReward(c *gin.Context) {
	var reward models.Reward
	if err := c.ShouldBindJSON(&reward); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &reward); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Reward already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create reward")
		return
	}

	LogAudit(c, "CREATE", "reward", reward.ID, reward)
	api_response.Created(c, reward)
}

func AdminUpdateReward(c *gin.Context) {
	id := c.Param("id")
	var reward models.Reward
	if err := db.DB.Where(queryID, id).First(&reward).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Reward not found")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Cost        *int    `json:"cost"`
		Type        *string `json:"type"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["title"] = *input.Name
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.Cost != nil {
		updates["cost"] = *input.Cost
	}
	if input.Type != nil {
		updates["type"] = *input.Type
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Reward{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update reward")
			return
		}
	}

	LogAudit(c, "UPDATE", "reward", id, updates)
	api_response.Success(c, reward)
}

func AdminDeleteReward(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Reward{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete reward")
		return
	}
	LogAudit(c, "DELETE", "reward", id, nil)
	api_response.Success(c, nil)
}
