package handlers

import (
	"net/http"
	"time"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetSeasons(c *gin.Context) {
	var seasons []models.Season
	if err := db.DB.Order("start_date DESC").Find(&seasons).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch seasons")
		return
	}
	api_response.Success(c, seasons)
}

func AdminCreateSeason(c *gin.Context) {
	var item models.Season
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Season already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create season")
		return
	}

	api_response.Created(c, item)
}

func AdminUpdateSeason(c *gin.Context) {
	id := c.Param("id")
	var season models.Season
	if err := db.DB.Where(queryID, id).First(&season).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Season not found")
		return
	}

	var input struct {
		Name      *string    `json:"name"`
		Title     *string    `json:"title"`
		StartDate *time.Time `json:"startDate"`
		EndDate   *time.Time `json:"endDate"`
		IsActive  *bool      `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if input.Title != nil {
		updates["title"] = *input.Title
	} else if input.Name != nil {
		updates["title"] = *input.Name
	}
	if input.StartDate != nil {
		updates["start_date"] = *input.StartDate
	}
	if input.EndDate != nil {
		updates["end_date"] = *input.EndDate
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Season{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update season")
			return
		}
	}

	api_response.Success(c, season)
}

func AdminDeleteSeason(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Season{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete season")
		return
	}
	api_response.Success(c, nil)
}
