package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetCampaigns(c *gin.Context) {
	var campaigns []models.Campaign
	if err := db.DB.Order("created_at DESC").Find(&campaigns).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch campaigns")
		return
	}
	api_response.Success(c, campaigns)
}

func AdminCreateCampaign(c *gin.Context) {
	var item models.Campaign
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if item.Name == "" {
		api_response.Error(c, http.StatusBadRequest, "Campaign name is required")
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Campaign already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create campaign")
		return
	}

	api_response.Created(c, item)
}

func AdminUpdateCampaign(c *gin.Context) {
	id := c.Param("id")
	var campaign models.Campaign
	if err := db.DB.Where(queryID, id).First(&campaign).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Campaign not found")
		return
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
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
	if input.Status != nil {
		updates["status"] = *input.Status
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Campaign{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update campaign")
			return
		}
	}

	api_response.Success(c, campaign)
}

func AdminDeleteCampaign(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Campaign{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete campaign")
		return
	}
	api_response.Success(c, nil)
}
