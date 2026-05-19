package handlers

import (
	"net/http"
	"time"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func AdminGetCoupons(c *gin.Context) {
	var coupons []models.Coupon
	if err := db.DB.Order("created_at DESC").Find(&coupons).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch coupons")
		return
	}
	api_response.Success(c, coupons)
}

func AdminCreateCoupon(c *gin.Context) {
	var item models.Coupon
	if err := c.ShouldBindJSON(&item); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := SafeCreate(db.DB, &item); err != nil {
		if IsDuplicateKeyError(err) {
			api_response.Error(c, http.StatusConflict, "Coupon with this code already exists")
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to create coupon")
		return
	}

	api_response.Created(c, item)
}

func AdminUpdateCoupon(c *gin.Context) {
	id := c.Param("id")
	var coupon models.Coupon
	if err := db.DB.Where(queryID, id).First(&coupon).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Coupon not found")
		return
	}

	var input struct {
		Code           *string    `json:"code"`
		DiscountType   *string    `json:"discountType"`
		DiscountValue  *float64   `json:"discountValue"`
		ExpirationDate *time.Time `json:"expirationDate"`
		MaxUses        *int       `json:"maxUses"`
		IsActive       *bool      `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if input.Code != nil {
		updates["code"] = *input.Code
	}
	if input.DiscountType != nil {
		updates["discount_type"] = *input.DiscountType
	}
	if input.DiscountValue != nil {
		updates["discount_value"] = *input.DiscountValue
	}
	if input.ExpirationDate != nil {
		updates["expiration_date"] = *input.ExpirationDate
	}
	if input.MaxUses != nil {
		updates["max_uses"] = *input.MaxUses
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.Coupon{}).Where(queryID, id).Updates(updates).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to update coupon")
			return
		}
	}

	LogAudit(c, "UPDATE", "coupon", id, updates)
	api_response.Success(c, coupon)
}

func AdminDeleteCoupon(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Where(queryID, id).Delete(&models.Coupon{}).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete coupon")
		return
	}
	LogAudit(c, "DELETE", "coupon", id, nil)
	api_response.Success(c, nil)
}
