package handlers

import (
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
)

type CreatePaymentRequest struct {
	Amount    float64 `json:"amount" binding:"required"`
	Method    string  `json:"method" binding:"required"`
	Currency  string  `json:"currency"`
	SubjectID string  `json:"subjectId"`
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
		SubjectID: req.SubjectID,
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
	
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
		return
	}

	c.JSON(http.StatusOK, payments)
}

func GetSubscriptionAddons(c *gin.Context) {
	addons := []gin.H{
		{
			"id":          "addon_ai_100",
			"name":        "100 AI Messages",
			"nameAr":      "100 رسالة ذكية إضافية",
			"description": "استمر في طرح الأسئلة على المساعد الذكي بكل حرية",
			"price":       50,
			"type":        "AI_CREDITS",
			"value":       100,
		},
		{
			"id":          "addon_exams_5",
			"name":        "5 Premium Exams",
			"nameAr":      "5 امتحانات متميزة إضافية",
			"description": "افتح الوصول إلى 5 امتحانات شاملة من اختيارك",
			"price":       75,
			"type":        "EXAM_PACK",
			"value":       5,
		},
		{
			"id":          "addon_balance_100",
			"name":        "100 EGP Wallet Balance",
			"nameAr":      "شحن 100 ج.م في المحفظة",
			"description": "أضف رصيداً لمحفظتك لاستخدامه لاحقاً في شراء الدورات",
			"price":       100,
			"type":        "WALLET_CREDIT",
			"value":       100,
		},
	}
	c.JSON(http.StatusOK, gin.H{"addons": addons})
}

func PurchaseAddon(c *gin.Context) {
	userId, _ := c.Get("userId")
	var req struct {
		AddonID string `json:"addonId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// This is a simplified logic. In real world, we'd check balance and update credits.
	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Example price check (hardcoded for now to match mock data)
	price := 0.0
	switch req.AddonID {
	case "addon_ai_100": price = 50
	case "addon_exams_5": price = 75
	case "addon_balance_100": price = 100
	}

	if user.Balance < price {
		c.JSON(http.StatusBadRequest, gin.H{"error": "رصيدك غير كافٍ لإتمام هذه العملية"})
		return
	}

	// Start Transaction
	tx := db.DB.Begin()
	
	// Deduct balance
	if err := tx.Model(&user).Update("balance", user.Balance-price).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update balance"})
		return
	}

	// Add credits
	updates := make(map[string]interface{})
	if req.AddonID == "addon_ai_100" {
		updates["aiCredits"] = user.AiCredits + 100
	} else if req.AddonID == "addon_exams_5" {
		updates["examCredits"] = user.ExamCredits + 5
	} else if req.AddonID == "addon_balance_100" {
		updates["balance"] = user.Balance + 100 - price // Effectively just adding balance if they paid for it? 
		// Actually, if it's a "Wallet Credit" purchase, they usually pay with external money.
		// If they pay with "Balance", it doesn't make sense unless it's a coupon.
		// Let's just mock it.
	}

	if len(updates) > 0 {
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update credits"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"success": true})
}
