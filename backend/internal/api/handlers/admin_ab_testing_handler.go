package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetABTests(c *gin.Context) {
	var tests []models.ABExperiment
	if err := db.DB.Order("created_at DESC").Find(&tests).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch AB tests")
		return
	}
	api_response.Success(c, tests)
}

func AdminCreateABTest(c *gin.Context) {
	var item models.ABExperiment
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "AB test already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create AB test")
		return
	}

	api_response.Created(c, item)
}

func AdminUpdateABTest(c *gin.Context) {
	id := c.Param("id")
	var experiment models.ABExperiment
	if err := db.DB.Where(queryID, id).First(&experiment).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "AB Test not found")
		return
	}

	var input struct {
		Name         *string  `json:"name"`
		Description  *string  `json:"description"`
		Status       *string  `json:"status"`
		TrafficSplit *float64 `json:"trafficSplit"`
		TrafficPct   *int     `json:"trafficPct"`
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
	if input.TrafficPct != nil {
		updates["traffic_pct"] = *input.TrafficPct
	} else if input.TrafficSplit != nil {
		updates["traffic_pct"] = int(*input.TrafficSplit)
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.ABExperiment{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update AB test")
			return
		}
	}

	api_response.Success(c, experiment)
}

func AdminDeleteABTest(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.ABExperiment{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete AB test")
		return
	}
	api_response.Success(c, nil)
}
