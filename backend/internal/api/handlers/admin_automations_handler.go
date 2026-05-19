package handlers

import (
	"net/http"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetAutomations(c *gin.Context) {
	var automations []models.Automation
	if err := db.DB.Order("created_at DESC").Find(&automations).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch automations")
		return
	}
	api_response.Success(c, automations)
}

func AdminCreateAutomation(c *gin.Context) {
	var item models.Automation
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Automation already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create automation")
		return
	}

	api_response.Created(c, item)
}

func AdminUpdateAutomation(c *gin.Context) {
	id := c.Param("id")
	var automation models.Automation
	if err := db.DB.Where(queryID, id).First(&automation).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Automation not found")
		return
	}

	var input struct {
		Name      *string `json:"name"`
		Type      *string `json:"type"`
		Trigger   *string `json:"trigger"`
		Action    *string `json:"action"`
		Condition *string `json:"condition"`
		IsActive  *bool   `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Type != nil {
		updates["type"] = *input.Type
	}
	if input.Trigger != nil {
		updates["trigger"] = *input.Trigger
	}
	if input.Action != nil {
		updates["action"] = *input.Action
	}
	if input.Condition != nil {
		updates["condition"] = *input.Condition
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Automation{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update automation")
			return
		}
	}

	api_response.Success(c, automation)
}

func AdminDeleteAutomation(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Automation{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete automation")
		return
	}
	api_response.Success(c, nil)
}
