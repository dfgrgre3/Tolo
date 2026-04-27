package handlers

import (
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
)

type CreatePaymentRequest struct {
	Amount   float64 `json:"amount" binding:"required"`
	Method   string  `json:"method" binding:"required"`
	Currency string  `json:"currency"`
}

func CreatePayment(c *gin.Context) {
	userId, _ := c.Get("userId")
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Currency == "" {
		req.Currency = "EGP"
	}

	payment := models.Payment{
		UserID:    userId.(string),
		Amount:    req.Amount,
		Currency:  req.Currency,
		Method:    req.Method,
		Status:    models.PaymentPending,
		Reference: "REF-" + time.Now().Format("20060102150405"),
	}

	if err := db.DB.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
		return
	}

	c.JSON(http.StatusCreated, payment)
}

func GetPaymentHistory(c *gin.Context) {
	userId, _ := c.Get("userId")
	var payments []models.Payment
	
	if err := db.DB.Where("user_id = ?", userId).Order("created_at desc").Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
		return
	}

	c.JSON(http.StatusOK, payments)
}
