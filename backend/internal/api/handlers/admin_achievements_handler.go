package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetAchievements(c *gin.Context) {
	var achievements []models.Achievement
	if err := db.DB.Order("created_at DESC").Find(&achievements).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch achievements")
		return
	}
	api_response.Success(c, achievements)
}

func AdminCreateAchievement(c *gin.Context) {
	var achievement models.Achievement
	if err := c.ShouldBindJSON(&achievement); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &achievement); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Achievement already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create achievement")
		return
	}

	LogAudit(c, "CREATE", "achievement", achievement.ID, achievement)
	api_response.Created(c, achievement)
}

func AdminUpdateAchievement(c *gin.Context) {
	id := c.Param("id")
	var achievement models.Achievement
	if err := db.DB.Where(queryID, id).First(&achievement).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Achievement not found")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Icon        *string `json:"icon"`
		Points      *int    `json:"points"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.Icon != nil {
		updates["icon"] = *input.Icon
	}
	if input.Points != nil {
		updates["points"] = *input.Points
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Achievement{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update achievement")
			return
		}
	}

	LogAudit(c, "UPDATE", "achievement", id, updates)
	api_response.Success(c, achievement)
}

func AdminDeleteAchievement(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Achievement{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete achievement")
		return
	}
	LogAudit(c, "DELETE", "achievement", id, nil)
	api_response.Success(c, nil)
}
